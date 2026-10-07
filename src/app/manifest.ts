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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
