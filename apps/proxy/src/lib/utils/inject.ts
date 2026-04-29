import Enkryptify, { EnkryptifyError } from "@enkryptify/sdk";
import type { InjectParams, InjectResult } from "@/modules/v1/proxy/proxy.schemas";
import { BadRequestError } from "@/lib/utils/errors";

const PLACEHOLDER_REGEX = /%([^%]+)%/g;

function extractPlaceholders(value: string): string[] {
  //%placeholder% is a placeholder for a secret. It is replaced with the secret value when the request is made.
  PLACEHOLDER_REGEX.lastIndex = 0;
  return [...value.matchAll(PLACEHOLDER_REGEX)].map((m) => m[1]!);
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
          throw new BadRequestError(`Secret "${key}" could not be resolved, it is either missing or empty.`);
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
  PLACEHOLDER_REGEX.lastIndex = 0;
  return value.replace(PLACEHOLDER_REGEX, (_, key: string) => {
    return secrets.get(key) ?? `%${key}%`;
  });
}

function replaceInObject(
  obj: InjectParams["body"],
  secrets: Map<string, string>,
): InjectResult["body"] {
  if (typeof obj === "string") {
    return replaceInString(obj, secrets);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceInObject(item, secrets));
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, InjectResult["body"]> = {};
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
  body: InjectParams["body"],
): string[] {
  const keys: string[] = [];

  keys.push(...extractPlaceholders(url));

  for (const value of Object.values(headers)) {
    keys.push(...extractPlaceholders(value));
  }

  keys.push(...extractFromBodyValue(body));

  return keys;
}

function extractFromBodyValue(value: InjectParams["body"]): string[] {
  if (typeof value === "string") return extractPlaceholders(value);
  if (Array.isArray(value)) return value.flatMap(extractFromBodyValue);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(extractFromBodyValue);
  }
  return [];
}

export async function injectSecrets(params: InjectParams): Promise<InjectResult> {
  const { url, headers, body, workspace, project, environmentId, authorization } = params;

  const allKeys = collectAllPlaceholders(url, headers, body);

  if (allKeys.length === 0) {
    return { url, headers, body };
  }

  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : authorization;

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
    body: replaceInObject(body, secrets),
  };
}
