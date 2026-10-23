import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Reader access — Storyhouse" },
      { name: "description", content: "Sign in with your invite code and read Under Blue Skies and SPOOK." },
      { property: "og:title", content: "Reader access — Storyhouse" },
      { property: "og:description", content: "Sign in with your invite code and read Under Blue Skies and SPOOK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadPage,
});
