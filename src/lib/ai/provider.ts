// Penyedia LLM (Blueprint 10.3). Memakai fetch langsung (tanpa SDK) sehingga tidak menambah dependensi,
// mudah diuji dengan penyedia palsu, dan hostnya dibatasi allowlist. Kunci hanya dibaca dari env server.

export interface PermintaanLlm {
  system: string;
  user: string;
  suhu?: number;
  maksTokenKeluaran?: number;
  /** Batas waktu panggilan ini dalam milidetik. */
  timeoutMs: number;
}

export interface LlmProvider {
  nama: string;
  /** Mengembalikan teks JSON mentah dari model. Melempar Error bila gagal. */
  hasilJson(req: PermintaanLlm): Promise<string>;
}

export class GalatProvider extends Error {
  constructor(
    message: string,
    public jenis: "timeout" | "kuota" | "tolak" | "galat",
  ) {
    super(message);
    this.name = "GalatProvider";
  }
}

const HOST_GEMINI = "generativelanguage.googleapis.com";
const MODEL_BAWAAN = "gemini-2.5-flash"; // ganti lewat GEMINI_MODEL; kuota gratis dicek di AI Studio

/** Buang pagar kode ``` bila model membungkus JSON-nya. */
export function ekstrakJson(teks: string): string {
  const t = teks.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m) return m[1];
  const awal = t.indexOf("{");
  const akhir = t.lastIndexOf("}");
  return awal >= 0 && akhir > awal ? t.slice(awal, akhir + 1) : t;
}

async function panggil(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new GalatProvider("waktu habis", "timeout");
    throw new GalatProvider("jaringan gagal", "galat");
  } finally {
    clearTimeout(timer);
  }
}

function jenisDariStatus(status: number): GalatProvider["jenis"] {
  if (status === 429) return "kuota";
  if (status === 400 || status === 403) return "tolak";
  return "galat";
}

export function geminiProvider(apiKey: string, model: string): LlmProvider {
  return {
    nama: `gemini:${model}`,
    async hasilJson(req) {
      const url = `https://${HOST_GEMINI}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await panggil(
        url,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: [{ role: "user", parts: [{ text: req.user }] }],
            generationConfig: {
              temperature: req.suhu ?? 0.3,
              maxOutputTokens: req.maksTokenKeluaran ?? 4096,
              responseMimeType: "application/json",
            },
          }),
        },
        req.timeoutMs,
      );
      if (!res.ok) throw new GalatProvider(`gemini ${res.status}`, jenisDariStatus(res.status));
      const data = (await res.json()) as {
        candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
        promptFeedback?: { blockReason?: string };
      };
      if (data.promptFeedback?.blockReason) throw new GalatProvider("diblokir penyedia", "tolak");
      const teks = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!teks) throw new GalatProvider("keluaran kosong", "galat");
      return ekstrakJson(teks);
    },
  };
}

/** Antarmuka kompatibel OpenAI (LLM2_*): POST {base}/chat/completions. */
export function openAiCompatProvider(baseUrl: string, apiKey: string, model: string): LlmProvider {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    nama: `llm2:${model}`,
    async hasilJson(req) {
      const res = await panggil(
        `${base}/chat/completions`,
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: req.suhu ?? 0.3,
            max_tokens: req.maksTokenKeluaran ?? 4096,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
          }),
        },
        req.timeoutMs,
      );
      if (!res.ok) throw new GalatProvider(`llm2 ${res.status}`, jenisDariStatus(res.status));
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const teks = data.choices?.[0]?.message?.content ?? "";
      if (!teks) throw new GalatProvider("keluaran kosong", "galat");
      return ekstrakJson(teks);
    },
  };
}

/** Rantai penyedia dari variabel lingkungan: utama (Gemini), lalu kedua (opsional). Kosong = langsung templat. */
export function penyediaDariEnv(env: Record<string, string | undefined> = process.env): LlmProvider[] {
  const out: LlmProvider[] = [];
  if (env.GEMINI_API_KEY) out.push(geminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || MODEL_BAWAAN));
  const base = env.LLM2_BASE_URL;
  if (base && env.LLM2_API_KEY && env.LLM2_MODEL && /^https:\/\//i.test(base)) {
    out.push(openAiCompatProvider(base, env.LLM2_API_KEY, env.LLM2_MODEL));
  }
  return out;
}
