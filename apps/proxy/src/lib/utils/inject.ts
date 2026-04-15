/**
 * Secret injection: finds `%SECRET_NAME%` in the outgoing URL, headers, and (when safe) body,
 * resolves values via Enkryptify, then substitutes. Binary or non-text bodies skip body substitution
 * so bytes are never interpreted as UTF-8 text (see body-secret-policy.ts).
 */

import Enkryptify, { EnkryptifyError } from "@enkryptify/sdk";
import type { InjectParams, InjectResult } from "@/modules/v1/proxy/proxy.schemas";
import { BadRequestError } from "@/lib/utils/errors";
import {
  getContentTypeMediaType,
  shouldApplySecretSubstitutionToBody,
} from "@/lib/utils/body-secret-policy";

function extractPlaceholders(value: string): string[] {
  //%placeholder% is a placeholder for a secret. It is replaced with the secret value when the request is made.
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

/** Replaces every `%key%` where `secrets` has `key`; unknown keys stay as `%key%`. */
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

/**
 * Collects placeholder names needed for Enkryptify. URL and headers are always scanned.
 * `includeBody` is false for binary / unsafe Content-Types so we never read `%...%` inside raw bytes.
 */
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

export async function injectSecrets(params: InjectParams): Promise<InjectResult> {
  const { url, headers, body, bodyEncoding, workspace, project, environmentId, authorization } =
    params;

  const mediaType = getContentTypeMediaType(headers);
  const applyBodySubstitution = shouldApplySecretSubstitutionToBody(mediaType, bodyEncoding, body);

  const allKeys = collectAllPlaceholders(url, headers, body, applyBodySubstitution);

  if (allKeys.length === 0) {
    return { url, headers, body };
  }

  const token = authorization.replace(/^[Bb]earer\s+/, "");

  const client = new Enkryptify({
    token,
    workspace,
    project,
    environment: environmentId,
  });

  const secrets = await resolveSecrets(allKeys, client);

  return {
    url: replaceInString(url, secrets),
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k, replaceInString(v, secrets)]),
    ),
    // Body unchanged when substitution would corrupt binary or base64 payloads.
    body: applyBodySubstitution ? replaceInObject(body, secrets) : body,
  };
}
