import { Fragment, type ReactNode } from "react";

/** Render **tebal** sebagai <strong>; selebihnya teks biasa (React meng-escape semuanya, aman dari XSS). */
function sebaris(teks: string): ReactNode[] {
  return teks.split(/(\*\*[^*]+\*\*)/g).map((b, i) =>
    b.startsWith("**") && b.endsWith("**") && b.length > 4 ? <strong key={i}>{b.slice(2, -2)}</strong> : <Fragment key={i}>{b}</Fragment>,
  );
}

type Blok = { jenis: "p"; baris: string[] } | { jenis: "ul" | "ol"; butir: string[] };

/** Pecah teks berformat ringan (dari `bersihkanTeksChat`) menjadi paragraf, daftar poin, dan daftar bernomor. */
export function uraiBlok(teks: string): Blok[] {
  const out: Blok[] = [];
  for (const baris of teks.split("\n")) {
    const t = baris.trim();
    const akhir = out[out.length - 1];
    if (!t) {
      out.push({ jenis: "p", baris: [] });
      continue;
    }
    const ul = t.match(/^-\s+(.*)$/);
    const ol = t.match(/^\d{1,2}[.)]\s+(.*)$/);
    if (ul || ol) {
      const jenis = ul ? "ul" : "ol";
      const isi = (ul ?? ol)![1];
      if (akhir && akhir.jenis === jenis) akhir.butir.push(isi);
      else out.push({ jenis, butir: [isi] });
    } else if (akhir && akhir.jenis === "p") akhir.baris.push(t);
    else out.push({ jenis: "p", baris: [t] });
  }
  return out.filter((b) => (b.jenis === "p" ? b.baris.length > 0 : b.butir.length > 0));
}

export function TeksFormat({ teks }: { teks: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {uraiBlok(teks).map((b, i) =>
        b.jenis === "p" ? (
          <p key={i}>{sebaris(b.baris.join(" "))}</p>
        ) : b.jenis === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.butir.map((x, j) => <li key={j}>{sebaris(x)}</li>)}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {b.butir.map((x, j) => <li key={j}>{sebaris(x)}</li>)}
          </ol>
        ),
      )}
    </div>
  );
}
