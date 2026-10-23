import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Storyhouse" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});
