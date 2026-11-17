// Anggaran AI harian global dan cache respons di memori (Blueprint 10.2, 10.3, 13.1).
// Pada lingkungan serverless keduanya bersifat upaya terbaik; kegagalannya selalu berujung ke mode cadangan.

const BUDGET_BAWAAN = 300;

export function bacaAnggaran(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.AI_DAILY_BUDGET);
  return Number.isFinite(n) && n >= 0 && env.AI_DAILY_BUDGET !== undefined && env.AI_DAILY_BUDGET !== "" ? Math.floor(n) : BUDGET_BAWAAN;
}

/** Tanggal WIB (UTC+7) sebagai kunci hari agar anggaran berganti pada tengah malam waktu Indonesia. */
export const kunciHari = (d: Date): string => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export class AnggaranHarian {
  private hari = "";
  private terpakai = 0;
  constructor(
    private batas: () => number = () => bacaAnggaran(),
    private sekarang: () => Date = () => new Date(),
  ) {}

  private segarkan() {
    const h = kunciHari(this.sekarang());
    if (h !== this.hari) {
      this.hari = h;
      this.terpakai = 0;
    }
  }
  /** Coba memakai satu panggilan; false bila anggaran habis. */
  pakai(): boolean {
    this.segarkan();
    if (this.terpakai >= this.batas()) return false;
    this.terpakai++;
    return true;
  }
  get sisa(): number {
    this.segarkan();
    return Math.max(0, this.batas() - this.terpakai);
  }
}

export class CacheTtl<T> {
  private m = new Map<string, { v: T; t: number }>();
  constructor(
    private ttlMs: number,
    private maks = 200,
  ) {}
  get(k: string, now = Date.now()): T | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (now - e.t > this.ttlMs) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: T, now = Date.now()) {
    if (this.m.size >= this.maks) {
      const tertua = this.m.keys().next().value;
      if (tertua !== undefined) this.m.delete(tertua);
    }
    this.m.set(k, { v, t: now });
  }
}

export const anggaranGlobal = new AnggaranHarian();
