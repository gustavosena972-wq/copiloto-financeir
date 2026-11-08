const URL_ENV = "UPSTASH_REDIS_REST_URL";
const TOKEN_ENV = "UPSTASH_REDIS_REST_TOKEN";

function credentials() {
  const url = Deno.env.get(URL_ENV)?.replace(/\\/$/, "");
  const token = Deno.env.get(TOKEN_ENV);
  return url && token ? { url, token } : null;
}

async function command<T>(parts: Array<string | number>): Promise<T | null> {
  const config = credentials();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis HTTP ${response.status}`);
  }

  const payload = await response.json() as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

export async function getTamanduaMemory(key: string): Promise<Record<string, unknown> | null> {
  const value = await command<string>(["GET", key]);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setTamanduaMemory(
  key: string,
  value: Record<string, unknown>,
  ttlSeconds = 86400,
): Promise<void> {
  await command(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
}
