import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SKENARIO, SKENARIO_BY_ID } from "@/lib/latihan/skenario";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return SKENARIO.map((s) => ({ id: s.id }));
}

/** Alamat latihan lama per skenario: dialihkan ke Simulator Bencana AI untuk bencana yang sama. */
async function Alihkan({ params }: Props): Promise<null> {
  const s = SKENARIO_BY_ID[(await params).id];
  redirect(s ? `/latihan?bahaya=${s.hazard}` : "/latihan");
}

export default function LatihanLama(props: Props) {
  return (
    <Suspense fallback={null}>
      <Alihkan params={props.params} />
    </Suspense>
  );
}
