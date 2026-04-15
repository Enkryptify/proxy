import Enkryptify from "@enkryptify/sdk";
import type { InjectParams, InjectResult } from "@/modules/v1/proxy/proxy.schemas";

//%placeholder% is a placeholder for a secret. It is replaced with the secret value when the request is made.
const PLACEHOLDER_REGEX = /%([^%]+)%/g;

function extractPlaceholders(value: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_REGEX.exec(value)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

async function resolveSecrets(
  keys: string[],
  client: Enkryptify,
): Promise<Map<string, string>> {
  const secrets = new Map<string, string>();
  const unique = [...new Set(keys)];

  await Promise.all(
    unique.map(async (key) => {
      const value = await client.get(key);
      if (value !== null && value !== undefined) {
        secrets.set(key, String(value));
      }
    }),
  );

  return secrets;
}

function replaceInString(value: string, secrets: Map<string, string>): string {
  return value.replace(PLACEHOLDER_REGEX, (_, key: string) => {
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
): string[] {
  const keys: string[] = [];

  keys.push(...extractPlaceholders(url));

  for (const value of Object.values(headers)) {
    keys.push(...extractPlaceholders(value));
  }

  keys.push(...extractFromUnknown(body));

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
  const { url, headers, body, workspace, project, environmentId, authorization } = params;

  const allKeys = collectAllPlaceholders(url, headers, body);

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
    body: replaceInObject(body, secrets),
  };
}
