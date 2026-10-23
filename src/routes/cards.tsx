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

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { logout, getMe } from "@/lib/storyhouse.functions";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";

function CardsPage() {
  const getMeFn = useServerFn(getMe);
  const logoutFn = useServerFn(logout);
  const [quote, setQuote] = useState("");
  const [attribution, setAttribution] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    getMeFn().catch(() => undefined);
  }, [getMeFn]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1350;
    ctx.fillStyle = "#f6f3ec";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#b08d57";
    ctx.lineWidth = 3;
    ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

    const text = quote.trim() || "Write the line you want to keep…";
    ctx.fillStyle = "#2b2721";
    ctx.font = "italic 44px Georgia, serif";
    ctx.textAlign = "center";
    wrapText(ctx, `“${text}”`, canvas.width / 2, 320, canvas.width - 260, 64);
    ctx.font = "24px Georgia, serif";
    ctx.fillStyle = "#8a7a63";
    ctx.fillText(attribution.trim() ? `— ${attribution.trim()}` : "— Storyhouse", canvas.width / 2, canvas.height - 180);
  };

  const download = () => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "storyhouse-quote.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader active="cards" />
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-6 pb-24 pt-12 md:grid-cols-2">
        <section>
          <h1 className="text-3xl font-semibold">Quote studio</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Lift a line from the reading room and turn it into a card worth keeping.
          </p>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={5}
            placeholder="Paste or write your quote…"
            className="mt-8 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="Attribution (optional)"
            className="mt-4 w-full rounded-lg border border-input bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-6 flex gap-3">
            <button
              onClick={download}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Download PNG
            </button>
            <button
              onClick={() => logoutFn().then(() => toast("Signed out.")).catch(() => undefined)}
              className="rounded-lg border px-5 py-2 text-sm"
            >
              Sign out
            </button>
          </div>
        </section>
        <section className="flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onInput={draw}
            className="aspect-[4/5] w-full max-w-sm rounded-xl border shadow-sm"
            aria-label="Quote card preview"
          />
          <PreviewDrawer onChange={draw} />
        </section>
      </main>
    </div>
  );
}

function PreviewDrawer({ onChange }: { onChange: () => void }) {
  useEffect(() => {
    onChange();
  }, [onChange]);
  return null;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

