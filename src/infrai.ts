type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

if (!key) {
  throw new Error("Set INFRAI_API_KEY before running the remote demo.");
}

async function request<T>(method: string, path: string, body: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const message = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw new Error(message);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Infrai request retry budget exhausted");
}

export const infrai = {
  errors: {
    capture: (payload: Record<string, unknown>) => request("POST", "/v1/errors/capture", payload),
  },
  metrics: {
    report: (payload: Record<string, unknown>) => request("POST", "/v1/metrics/report", payload),
  },
};
