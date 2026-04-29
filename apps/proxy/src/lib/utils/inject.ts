import Enkryptify, { EnkryptifyError } from "@enkryptify/sdk";
import type { InjectParams, InjectResult } from "@/modules/v1/proxy/proxy.schemas";
import { BadRequestError } from "@/lib/utils/errors";
import {
  getContentTypeMediaType,
  shouldApplySecretSubstitutionToBody,
} from "@/lib/utils/bodySecretPolicy";

function extractPlaceholders(value: string): string[] {
  return [...value.matchAll(/%([^%]+)%/g)].map((m) => m[1]!);
}

async function resolveSecrets(
  keys: string[],
  client: Enkryptify,
): Promise<Map<string, string>> {
  const secrets = new Map<string, string>();
  const unique = [...new Set(keys)];

  await Promise.all(
    unique.map(async (key) => {
      try {
        const value = await client.get(key);
        if (value === null || value === undefined) {
          throw new BadRequestError(`Secret "${key}" could not be resolved (missing or empty)`);
        }
        secrets.set(key, String(value));
      } catch (error) {
        if (error instanceof EnkryptifyError) throw error;
        if (error instanceof BadRequestError) throw error;
        throw new Error(
          `Failed to resolve secret "${key}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }),
  );

  return secrets;
}

function replaceInString(value: string, secrets: Map<string, string>): string {
  return value.replace(new RegExp("%([^%]+)%", "g"), (_, key: string) => {
    return secrets.get(key) ?? `%${key}%`;
  });
}

function replaceInObject(obj: unknown, secrets: Map<string, string>): unknown {
  if (typeof obj === "string") {
    return replaceInString(obj, secrets);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceInObject(item, secrets));
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceInObject(value, secrets);
    }
    return result;
  }
  return obj;
}

function collectAllPlaceholders(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  includeBody: boolean,
): string[] {
  const keys: string[] = [];

  keys.push(...extractPlaceholders(url));

  for (const value of Object.values(headers)) {
    keys.push(...extractPlaceholders(value));
  }

  if (includeBody) {
    keys.push(...extractFromUnknown(body));
  }

  return keys;
}

function extractFromUnknown(value: unknown): string[] {
  if (typeof value === "string") return extractPlaceholders(value);
  if (Array.isArray(value)) return value.flatMap(extractFromUnknown);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(extractFromUnknown);
  }
  return [];
}

type LoggingParams = Pick<InjectParams, "url" | "headers" | "body" | "bodyEncoding">;

export function collectPlaceholderKeysForLogging(params: LoggingParams): string[] {
  const keysFromUrlAndHeaders = collectAllPlaceholders(params.url, params.headers, params.body, false);
  if (params.bodyEncoding === "base64") {
    return [...new Set(keysFromUrlAndHeaders)];
  }
  const mediaType = getContentTypeMediaType(params.headers);
  const contentTypeHeader = Object.entries(params.headers).find(
    ([key]) => key.toLowerCase() === "content-type",
  )?.[1];
  const hasSecretBackedContentType =
    typeof contentTypeHeader === "string" && extractPlaceholders(contentTypeHeader).length > 0;
  const applyBody = shouldApplySecretSubstitutionToBody(
    mediaType,
    params.bodyEncoding,
    params.body,
  );
  const keysFromBody = applyBody || hasSecretBackedContentType ? extractFromUnknown(params.body) : [];
  return [...new Set([...keysFromUrlAndHeaders, ...keysFromBody])];
}

export async function injectSecrets(params: InjectParams): Promise<InjectResult> {
  const { url, headers, body, bodyEncoding, workspace, project, environmentId, authorization } =
    params;

  const keysFromUrlAndHeaders = collectAllPlaceholders(url, headers, body, false);

  const token = authorization.replace(/^[Bb]earer\s+/, "");
  const createClient = () =>
    new Enkryptify({
      token,
      workspace,
      project,
      environment: environmentId,
    });

  let secrets = new Map<string, string>();
  if (keysFromUrlAndHeaders.length > 0) {
    secrets = await resolveSecrets([...new Set(keysFromUrlAndHeaders)], createClient());
  }

  const headersAfterUrlHeaderPass = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k, replaceInString(v, secrets)]),
  );

  const applyBodySubstitution = shouldApplySecretSubstitutionToBody(
    getContentTypeMediaType(headersAfterUrlHeaderPass),
    bodyEncoding,
    body,
  );

  const keysFromBody = applyBodySubstitution ? extractFromUnknown(body) : [];

  if (keysFromUrlAndHeaders.length === 0 && keysFromBody.length === 0) {
    return { url, headers, body };
  }

  const missingBodyKeys = [...new Set(keysFromBody)].filter((k) => !secrets.has(k));
  if (missingBodyKeys.length > 0) {
    const more = await resolveSecrets(missingBodyKeys, createClient());
    for (const [k, v] of more) {
      secrets.set(k, v);
    }
  }

  return {
    url: replaceInString(url, secrets),
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k, replaceInString(v, secrets)]),
    ),
    body: applyBodySubstitution ? replaceInObject(body, secrets) : body,
  };
}
