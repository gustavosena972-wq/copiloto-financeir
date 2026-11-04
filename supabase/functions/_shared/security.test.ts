import { parseJsonObjectRequest } from "./security.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("accepts a valid JSON object", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "login", username: "user01" }),
  });
  const result = await parseJsonObjectRequest(request);
  assert(result.ok, "valid object should be accepted");
  assert(result.value.action === "login", "parsed action should be preserved");
  assert(result.value.username === "user01", "parsed username should be preserved");
});

Deno.test("rejects malformed JSON with HTTP 400", async () => {
  const request = new Request("https://example.test", { method: "POST", body: "{" });
  const result = await parseJsonObjectRequest(request);
  assert(!result.ok && result.status === 400, "malformed JSON should return 400");
});

Deno.test("rejects null, arrays and scalar JSON values", async () => {
  for (const body of ["null", "[]", '"text"', "42", "true"]) {
    const request = new Request("https://example.test", { method: "POST", body });
    const result = await parseJsonObjectRequest(request);
    assert(!result.ok && result.status === 400, `non-object JSON must be rejected: ${body}`);
  }
});

Deno.test("rejects oversized Content-Length before reading the body", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    headers: { "content-length": "8193" },
    body: "{}",
  });
  const result = await parseJsonObjectRequest(request);
  assert(!result.ok && result.status === 413, "declared oversized request should return 413");
  assert(!request.bodyUsed, "oversized declared request should not be consumed");
});

Deno.test("enforces the byte limit for multibyte UTF-8 payloads", async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ value: "é".repeat(4100) }));
  assert(encoded.byteLength > 8192, "test fixture must exceed the byte limit");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
  const request = new Request("https://example.test", { method: "POST", body: stream });
  const result = await parseJsonObjectRequest(request);
  assert(!result.ok && result.status === 413, "multibyte body must be counted by bytes");
});

Deno.test("cancels an oversized streaming body as soon as the limit is crossed", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(8193));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("https://example.test", { method: "POST", body: stream });
  const result = await parseJsonObjectRequest(request);
  assert(!result.ok && result.status === 413, "oversized stream should return 413");
  assert(cancelled, "oversized stream should be cancelled immediately");
});
