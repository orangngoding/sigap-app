import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "SIGAP", short_name: "SIGAP", description: "Kesiapsiagaan bencana keluarga", start_url: "/darurat", display: "standalone", background_color: "#000000", theme_color: "#000000", lang: "id" };
}
