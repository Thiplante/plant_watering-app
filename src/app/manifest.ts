export default function manifest() {
  return {
    name: "Plant Watering",
    short_name: "Plants",
    description: "Suivi intelligent de tes plantes 🌿",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8f2",
    theme_color: "#234b34",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}