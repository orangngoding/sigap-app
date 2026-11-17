
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Identitas SIGAP */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              SIGAP
            </h2>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Siaga dan Tanggap Bencana. Membantu masyarakat memahami risiko
              dan mempersiapkan langkah perlindungan bagi keluarga.
            </p>
          </div>

          {/* Atribusi sumber data */}
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Atribusi Sumber Data
            </h2>

            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://www.bmkg.go.id/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  BMKG
                </a>
              </li>

              <li>
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  Open-Meteo
                </a>
                <span> - CC BY 4.0</span>
              </li>

              <li>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  OpenStreetMap contributors
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Tautan informasi */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-sm">
          <Link
            href="/metodologi"
            className="font-medium text-muted-foreground hover:text-primary"
          >
            Metodologi
          </Link>

          <Link
            href="/data-saya"
            className="font-medium text-muted-foreground hover:text-primary"
          >
            Data Saya
          </Link>
        </div>

        {/* Penafian */}
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          SIGAP merupakan alat bantu kesiapsiagaan dan bukan pengganti
          peringatan resmi atau arahan dari pihak berwenang.
        </p>

        <p className="mt-3 text-xs text-muted-foreground">
          SIGAP - Siaga dan Tanggap Bencana
        </p>
      </div>
    </footer>
  );
}
