import { createFileRoute } from "@tanstack/react-router";
import { verifySessionToken } from "@/lib/session.server";

const BOOK_PDFS: Record<string, string> = {
  "under-blue-skies": "under-blue-skies.pdf",
  spook: "spook.pdf",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/read/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie") ?? "";
        const match = cookie.match(/(?:^|;\s*)storyhouse_session=([^;]*)/);
        const token = match?.[1] ? decodeURIComponent(match[1]) : null;
        const session = await verifySessionToken(token);
        if (!session) {
          return jsonResponse({ error: "A whitelisted reader sign-in is required." }, 401);
        }
        const bookId = new URL(request.url).searchParams.get("book") ?? "";
        const path = BOOK_PDFS[bookId];
        if (!path) {
          return jsonResponse({ error: "Original print-layout file not found." }, 404);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("storyhouse-books").download(path);
        if (error || !data) {
          return jsonResponse({ error: "Original print-layout file not found." }, 404);
        }
        return new Response(data, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="${path}"`,
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
