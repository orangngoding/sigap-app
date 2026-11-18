// Penyedia LLM (Blueprint 10.3). Memakai fetch langsung (tanpa SDK) sehingga tidak menambah dependensi,
// mudah diuji dengan penyedia palsu, dan hostnya dibatasi allowlist. Kunci hanya dibaca dari env server.

export interface GiliranChat {
  peran: "pengguna" | "asisten";
  teks: string;
}

export interface PermintaanLlm {
  system: string;
  user: string;
  /** Giliran percakapan sebelumnya (paling lama dulu); pesan `user` adalah giliran terbaru. */
  riwayat?: GiliranChat[];
  suhu?: number;
  maksTokenKeluaran?: number;
  /**
   * Anggaran token "berpikir" sebelum menjawab (Gemini thinkingConfig). Dipakai Asisten agar jawaban lebih
   * runtut; penyedia lain mengabaikannya.
   */
  anggaranPikir?: number;
  /** Batas waktu panggilan ini dalam milidetik. */
  timeoutMs: number;
}

export interface SumberWeb {
  judul: string;
  url: string;
}

export interface HasilChat {
  /** Teks JSON mentah dari model. */
  teks: string;
  /** Halaman web yang dipakai model bila pencarian Google aktif (grounding). */
  sumberWeb: SumberWeb[];
}

export interface LlmProvider {
  nama: string;
  /** Mengembalikan teks JSON mentah dari model. Melempar Error bila gagal. */
  hasilJson(req: PermintaanLlm): Promise<string>;
  /**
   * Opsional: jawaban percakapan dengan pencarian Google (grounding). Penyedia tanpa fungsi ini
   * dipanggil lewat `hasilJson` dengan `riwayat`.
   */
  hasilChat?(req: PermintaanLlm): Promise<HasilChat>;
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
// Ganti lewat GEMINI_MODEL; kuota gratis dicek di AI Studio. Per 2026-11-17 gemini-2.5-flash membalas 404
// ("no longer available to new users") dan model Flash penuh sering 503 karena ramai, sedangkan Flash Lite stabil.
const MODEL_BAWAAN = "gemini-3.5-flash-lite";

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

/** Ubah riwayat + pesan terbaru menjadi `contents` Gemini (peran "user" / "model"). */
function kontenGemini(req: PermintaanLlm) {
  return [
    ...(req.riwayat ?? []).map((g) => ({ role: g.peran === "pengguna" ? "user" : "model", parts: [{ text: g.teks }] })),
    { role: "user", parts: [{ text: req.user }] },
  ];
}

type ResponsGemini = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
  promptFeedback?: { blockReason?: string };
};

/** Hanya tautan https yang dikembalikan; judul dibatasi panjangnya. Duplikat dibuang. */
export function sumberDariGrounding(data: ResponsGemini): SumberWeb[] {
  const out: SumberWeb[] = [];
  for (const c of data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
    const url = c.web?.uri ?? "";
    if (!/^https:\/\//i.test(url) || out.some((s) => s.url === url)) continue;
    out.push({ judul: (c.web?.title || new URL(url).hostname).slice(0, 120), url });
    if (out.length >= 5) break;
  }
  return out;
}

export function geminiProvider(apiKey: string, model: string, opsi: { pencarianWeb?: boolean } = {}): LlmProvider {
  const url = `https://${HOST_GEMINI}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  async function minta(req: PermintaanLlm, cari: boolean): Promise<ResponsGemini> {
    const res = await panggil(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: kontenGemini(req),
          // Alat pencarian Google tidak boleh dipadukan dengan responseMimeType JSON; JSON tetap diminta lewat instruksi.
          ...(cari ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            temperature: req.suhu ?? 0.3,
            maxOutputTokens: req.maksTokenKeluaran ?? 4096,
            ...(cari ? {} : { responseMimeType: "application/json" }),
            ...(req.anggaranPikir ? { thinkingConfig: { thinkingBudget: req.anggaranPikir } } : {}),
          },
        }),
      },
      req.timeoutMs,
    );
    if (!res.ok) throw new GalatProvider(`gemini ${res.status}`, jenisDariStatus(res.status));
    const data = (await res.json()) as ResponsGemini;
    if (data.promptFeedback?.blockReason) throw new GalatProvider("diblokir penyedia", "tolak");
    return data;
  }

  const teksDari = (data: ResponsGemini): string => {
    const teks = data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
    if (!teks) throw new GalatProvider("keluaran kosong", "galat");
    return ekstrakJson(teks);
  };

  return {
    nama: `gemini:${model}`,
    async hasilJson(req) {
      return teksDari(await minta(req, false));
    },
    async hasilChat(req) {
      if (opsi.pencarianWeb) {
        try {
          const data = await minta(req, true);
          return { teks: teksDari(data), sumberWeb: sumberDariGrounding(data) };
        } catch (e) {
          // Kuota grounding pada paket gratis bisa 0: jatuh ke jawaban tanpa pencarian, bukan galat.
          if (!(e instanceof GalatProvider) || e.jenis === "timeout") throw e;
        }
      }
      return { teks: teksDari(await minta(req, false)), sumberWeb: [] };
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
              ...(req.riwayat ?? []).map((g) => ({ role: g.peran === "pengguna" ? "user" : "assistant", content: g.teks })),
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
  // GEMINI_PENCARIAN=1 mengaktifkan grounding Google Search untuk Asisten (perlu kuota grounding di AI Studio).
  if (env.GEMINI_API_KEY) {
    out.push(geminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || MODEL_BAWAAN, { pencarianWeb: env.GEMINI_PENCARIAN === "1" }));
  }
  const base = env.LLM2_BASE_URL;
  if (base && env.LLM2_API_KEY && env.LLM2_MODEL && /^https:\/\//i.test(base)) {
    out.push(openAiCompatProvider(base, env.LLM2_API_KEY, env.LLM2_MODEL));
  }
  return out;
}
