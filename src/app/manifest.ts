import type { MetadataRoute } from "next";

// Permet aux menuisiers d'ajouter Palette à l'écran d'accueil de leur téléphone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Palette · The Good Experience",
    short_name: "Palette",
    description: "Déclarer et retrouver les éléments de stands stockés chez les menuisiers.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#111111",
    lang: "fr",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
