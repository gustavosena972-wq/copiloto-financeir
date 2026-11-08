import { assertEquals } from "jsr:@std/assert@1";
import { getTamanduaMemory, setTamanduaMemory } from "./redis.ts";

Deno.test("Redis adapter permanece inativo quando as credenciais não existem", async () => {
  const originalUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const originalToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  Deno.env.delete("UPSTASH_REDIS_REST_URL");
  Deno.env.delete("UPSTASH_REDIS_REST_TOKEN");

  try {
    assertEquals(await getTamanduaMemory("tamandua:test"), null);
    await setTamanduaMemory("tamandua:test", { ok: true });
  } finally {
    if (originalUrl !== undefined) Deno.env.set("UPSTASH_REDIS_REST_URL", originalUrl);
    if (originalToken !== undefined) Deno.env.set("UPSTASH_REDIS_REST_TOKEN", originalToken);
  }
});
