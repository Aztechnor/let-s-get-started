import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Quote studio — Storyhouse" },
      { name: "description", content: "Turn your favourite lines from the reading room into shareable quote cards." },
      { property: "og:title", content: "Quote studio — Storyhouse" },
      { property: "og:description", content: "Turn your favourite lines from the reading room into shareable quote cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardsPage,
});
