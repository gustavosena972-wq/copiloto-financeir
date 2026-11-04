export type JsonObjectRequestResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413; error: string };

const INVALID_JSON: JsonObjectRequestResult = {
  ok: false,
  status: 400,
  error: "Corpo JSON inválido.",
};

const INVALID_OBJECT: JsonObjectRequestResult = {
  ok: false,
  status: 400,
  error: "Corpo da solicitação inválido.",
};

const TOO_LARGE: JsonObjectRequestResult = {
  ok: false,
  status: 413,
  error: "Solicitação muito grande.",
};

/**
 * Reads at most maxBytes from a request stream and accepts JSON objects only.
 * Content-Length is an early-rejection hint; the streamed byte count is authoritative.
 */
export async function parseJsonObjectRequest(
  request: Request,
  maxBytes = 8192,
): Promise<JsonObjectRequestResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }

  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > maxBytes
  ) {
    return TOO_LARGE;
  }

  if (!request.body) return INVALID_OBJECT;

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return INVALID_OBJECT;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request is already rejected; cancellation failure is non-fatal.
        }
        return TOO_LARGE;
      }
      chunks.push(value);
    }
  } catch {
    return INVALID_OBJECT;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A locked or errored stream is already unusable by this request.
    }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return INVALID_JSON;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return INVALID_JSON;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return INVALID_OBJECT;
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
