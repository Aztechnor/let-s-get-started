import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { SiteHeader } from "@/components/site-chrome";
import { toast, toastSuccess, toastError, ToastHost } from "@/components/toast";
import { Spinner, ButtonSpinner, Badge } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

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

type TemplateId = "bluehour" | "wildflower" | "archive" | "redacted" | "moonlit" | "postcard";

const QUOTES: { quote: string; source: string; book: "under" | "spook"; template: TemplateId }[] = [
  { quote: "To have loved and lost is better than to have never loved at all.", source: "UNDER BLUE SKIES · EPIGRAPH", book: "under", template: "wildflower" },
  { quote: "It's easy to love the idea of someone, but much harder to love the reality.", source: "UNDER BLUE SKIES · I WILL NEVER HIT YOU", book: "under", template: "bluehour" },
  { quote: "Some wounds don't heal. Some scars don't fade.", source: "UNDER BLUE SKIES · I WILL NEVER HIT YOU", book: "under", template: "moonlit" },
  { quote: "For every dawn follows darkest day.", source: "UNDER BLUE SKIES · THE OPENING POEM", book: "under", template: "postcard" },
  { quote: "Promise me this, that you'll never be afraid to be human.", source: "UNDER BLUE SKIES · I WILL NEVER HIT YOU", book: "under", template: "wildflower" },
  { quote: "Land that sits too quietly.", source: "SPOOK · THE LAND", book: "spook", template: "archive" },
  { quote: "The Great North Road does not forget. It swallows.", source: "SPOOK · THE HITCHHIKER", book: "spook", template: "redacted" },
  { quote: "The land remembers. It sends its teeth.", source: "SPOOK · NANDI BEAR", book: "spook", template: "moonlit" },
  { quote: "You cannot build healing on a place that has not yet finished its grieving.", source: "SPOOK · THE LAND", book: "spook", template: "archive" },
  { quote: "Every story, a different document.", source: "SPOOK · COVER LINE", book: "spook", template: "redacted" },
];

const TEMPLATES: { id: TemplateId; name: string; desc: string; icon: string }[] = [
  { id: "bluehour", name: "Blue Hour", desc: "Soft, open, and hopeful.", icon: "🌊" },
  { id: "wildflower", name: "Wildflower", desc: "Warm paper, handwritten feeling.", icon: "🌼" },
  { id: "archive", name: "Archive File", desc: "Dark, precise, and recovered.", icon: "📁" },
  { id: "redacted", name: "Redacted", desc: "A rough-edged case file.", icon: "🔒" },
  { id: "moonlit", name: "Moonlit", desc: "Night sky and quiet mystery.", icon: "🌙" },
  { id: "postcard", name: "Postcard", desc: "A little note from somewhere.", icon: "📬" },
];

// Card artwork colors are part of each printed design (canvas pixels), not app theme tokens.
const PALETTES: Record<TemplateId, { bg1: string; bg2: string; ink: string; line: string; accent: string }> = {
  bluehour: { bg1: "#eef3ef", bg2: "#c4dce0", ink: "#2a4a5b", line: "#6b99a8", accent: "#b78768" },
  wildflower: { bg1: "#f7f0df", bg2: "#eadfc6", ink: "#355545", line: "#91a68f", accent: "#719879" },
  archive: { bg1: "#252824", bg2: "#171a18", ink: "#dfc589", line: "#947d4d", accent: "#a98c52" },
  redacted: { bg1: "#2a2825", bg2: "#161716", ink: "#efe4d0", line: "#aa6859", accent: "#c45e4f" },
  moonlit: { bg1: "#41496c", bg2: "#191e34", ink: "#f2e9d8", line: "#9aa3ca", accent: "#d4bf8c" },
  postcard: { bg1: "#f3f5ef", bg2: "#bdd8e0", ink: "#284b60", line: "#719bab", accent: "#d08c6a" },
};

interface CardOptions {
  template: TemplateId;
  quote: string;
  attribution: string;
  signature: string;
  ornament: boolean;
  number: number;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points = 8) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 ? inner : outer;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (!i) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function wrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawCard(canvas: HTMLCanvasElement, o: CardOptions) {
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const theme = o.template;
  const p = PALETTES[theme];
  const doc = theme === "archive" || theme === "redacted";
  const sans = doc ? "monospace" : "Arial";

  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, p.bg1);
  grad.addColorStop(1, p.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  if (theme === "bluehour" || theme === "postcard") {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#fff";
    for (const [x, y, r] of [[150, 220, 80], [820, 280, 115], [920, 1020, 60]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(855, 200, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (theme === "postcard") {
      // Airmail stripe border and stamp box.
      const stripes = ["#c4574a", "#f3f5ef", "#3f6d8a", "#f3f5ef"];
      for (let x = 40, i = 0; x < 1040; x += 36, i++) {
        ctx.fillStyle = stripes[i % 4] ?? "#fff";
        ctx.fillRect(x, 30, 36, 14);
        ctx.fillRect(x, 1306, 36, 14);
      }
      ctx.strokeStyle = p.line;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(860, 1090, 108, 128);
      ctx.setLineDash([]);
    }
  } else if (theme === "wildflower") {
    ctx.strokeStyle = "#83a389";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 7; i++) {
      const x = 112 + i * 145;
      ctx.beginPath();
      ctx.moveTo(x, 1030);
      ctx.quadraticCurveTo(x + 12, 1110, x - 3, 1205);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - 15, 1100, 16, 34, -0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + 18, 1150, 15, 28, 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (theme === "moonlit") {
    ctx.fillStyle = "rgba(245,239,215,.8)";
    for (let i = 0; i < 65; i++) {
      const x = ((i * 197) % 1020) + 30;
      const y = ((i * 317) % 900) + 40;
      drawStar(ctx, x, y, i % 3 === 0 ? 4 : 2, i % 3 === 0 ? 1.4 : 1, 4);
    }
    ctx.fillStyle = "#f3e6bd";
    ctx.beginPath();
    ctx.arc(830, 210, 65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#343a5b";
    ctx.beginPath();
    ctx.arc(860, 185, 63, 0, Math.PI * 2);
    ctx.fill();
  } else if (doc) {
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.setLineDash(theme === "redacted" ? [7, 9] : []);
    ctx.strokeRect(62, 62, 956, 1226);
    ctx.setLineDash([]);
    if (theme === "redacted") {
      ctx.fillStyle = "#a64238";
      ctx.globalAlpha = 0.78;
      ctx.fillRect(120, 210, 235, 17);
      ctx.fillRect(710, 1025, 245, 14);
      ctx.globalAlpha = 1;
    }
  }

  ctx.strokeStyle = p.line;
  ctx.lineWidth = theme === "redacted" ? 2 : 1.4;
  ctx.globalAlpha = 0.8;
  ctx.strokeRect(63, 63, 954, 1224);
  ctx.globalAlpha = 1;
  if (theme === "wildflower") {
    ctx.lineWidth = 1;
    ctx.strokeRect(82, 82, 916, 1186);
  }

  ctx.fillStyle = p.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 18px ${sans}`;
  ctx.fillText(doc ? "RECOVERED DOCUMENT / STORYHOUSE" : theme === "postcard" ? "GREETINGS FROM STORYHOUSE" : "A LINE TO KEEP", 112, 135);
  ctx.textAlign = "right";
  ctx.font = `600 16px ${sans}`;
  ctx.fillText(`${String(o.number).padStart(2, "0")} / ✓`, 968, 135);

  if (o.ornament) {
    ctx.fillStyle = p.accent;
    if (theme === "moonlit") drawStar(ctx, 540, 310, 34, 14, 8);
    else drawStar(ctx, 540, 310, 26, 11, 8);
  }

  const quote = `"${o.quote || "Write the line you want to keep…"}"`;
  const family = doc ? "monospace" : "Georgia, serif";
  const italic = theme === "wildflower" || theme === "postcard" ? "italic " : "";
  let fontSize = doc ? 55 : 67;
  let lines: string[] = [];
  do {
    ctx.font = `${italic}${fontSize}px ${family}`;
    lines = wrappedLines(ctx, quote, 805);
    if (lines.length > 6) fontSize -= 3;
    else break;
  } while (fontSize > 37);
  const lineHeight = fontSize * (doc ? 1.4 : 1.27);
  let y = 670 - (lines.length * lineHeight) / 2 + fontSize * 0.75;
  ctx.textAlign = "center";
  ctx.fillStyle = p.ink;
  for (const line of lines) {
    ctx.fillText(line, 540, y, 850);
    y += lineHeight;
  }

  ctx.strokeStyle = p.ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(420, 935);
  ctx.lineTo(660, 935);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `700 19px ${sans}`;
  const attribution = (o.attribution.trim() || "STORYHOUSE").toUpperCase();
  ctx.fillText(attribution.length > 54 ? attribution.slice(0, 51) + "…" : attribution, 540, 980, 820);
  if (o.signature.trim()) {
    ctx.font = "italic 24px Georgia, serif";
    ctx.globalAlpha = 0.8;
    ctx.fillText(o.signature.trim().slice(0, 48), 540, 1030, 790);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
  ctx.font = `700 15px ${sans}`;
  ctx.fillText("STORYHOUSE", 112, 1210);
  ctx.textAlign = "right";
  ctx.font = `600 13px ${sans}`;
  ctx.fillText("STORIES THAT STAY", 968, 1210);
}

function safeFileName(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "storyhouse-quote";
}

// Template swatch with icon
function TemplateSwatch({ id, icon }: { id: TemplateId; icon?: string }) {
  const p = PALETTES[id];
  return (
    <div className="relative h-10 w-10 shrink-0 rounded-md border overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${p.bg1}, ${p.bg2})` }}
      />
      {icon && (
        <div className="relative z-10 flex h-full w-full items-center justify-center text-white drop-shadow-md">
          {icon}
        </div>
      )}
    </div>
  );
}

// Template option button
function TemplateOption({
  id,
  name,
  desc,
  icon,
  selected,
  onClick,
}: {
  id: TemplateId;
  name: string;
  desc: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
        selected
          ? "border-primary ring-2 ring-primary"
          : "hover:bg-accent hover:border-accent"
      )}
    >
      <TemplateSwatch id={id} icon={icon} />
      <span className="flex-1">
        <b className="text-sm block">{name}</b>
        <small className="text-xs text-muted-foreground">{desc}</small>
      </span>
    </button>
  );
}

function CardsPage() {
  const [selected, setSelected] = useState(1);
  const [template, setTemplate] = useState<TemplateId>("bluehour");
  const [custom, setCustom] = useState("");
  const [attribution, setAttribution] = useState(QUOTES[1]?.source ?? "");
  const [signature, setSignature] = useState("");
  const [ornament, setOrnament] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const options: CardOptions = {
    template,
    quote: (custom.trim() || QUOTES[selected]?.quote || "").trim(),
    attribution,
    signature,
    ornament,
    number: selected + 1,
  };

  // Update canvas when options change
  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, options);
  }, [options]);

  const makeBlob = useCallback(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = document.createElement("canvas");
    drawCard(canvas, options);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  }, [options]);

  const download = useCallback(async () => {
    setIsDownloading(true);
    try {
      const blob = await makeBlob();
      if (!blob) {
        toastError("The card image could not be created in this browser.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(attribution)}-${template}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toastSuccess("Your 1080 × 1350 card is ready!");
    } catch {
      toastError("Failed to download card");
    } finally {
      setIsDownloading(false);
    }
  }, [makeBlob, attribution, template]);

  const share = useCallback(async () => {
    setIsSharing(true);
    try {
      const blob = await makeBlob();
      if (!blob) {
        toastError("The card image could not be created.");
        return;
      }
      const file = new File([blob], `${safeFileName(attribution)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "A line to keep · Storyhouse",
            text: options.quote,
          });
        } catch {
          // Share sheet dismissed
        }
      } else {
        await download();
      }
    } catch {
      toastError("Failed to share card");
    } finally {
      setIsSharing(false);
    }
  }, [makeBlob, download, attribution, options]);

  // Handle quote selection
  const handleQuoteSelect = (index: number) => {
    setSelected(index);
    setCustom("");
    setAttribution(QUOTES[index]?.source ?? "");
    setTemplate(QUOTES[index]?.template ?? "bluehour");
  };

  // Field input class
  const fieldClass = "w-full rounded-lg border border-input bg-card px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader active="cards" />
      
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-24 pt-12 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* Controls Section */}
        <section className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold">Quote studio</h1>
              <Badge variant="secondary">Beta</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Pick a line, choose a design, and download a card worth keeping.
            </p>
          </div>

          {/* Design Selection */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Design
            </p>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <TemplateOption
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  desc={t.desc}
                  icon={t.icon}
                  selected={template === t.id}
                  onClick={() => setTemplate(t.id)}
                />
              ))}
            </div>
          </div>

          {/* Quote Selection */}
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Choose a line
            </span>
            <select
              value={selected}
              onChange={(e) => handleQuoteSelect(Number(e.target.value))}
              className={fieldClass}
            >
              {QUOTES.map((q, i) => (
                <option key={i} value={i}>
                  {String(i + 1).padStart(2, "0")} · {q.quote.length > 65 ? q.quote.slice(0, 62) + "…" : q.quote} — {q.book === "spook" ? "SPOOK" : "UNDER BLUE SKIES"}
                </option>
              ))}
            </select>
          </label>

          {/* Custom Quote */}
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            placeholder="…or write your own quote"
            className={fieldClass}
          />

          {/* Attribution */}
          <input
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="Attribution (e.g., UNDER BLUE SKIES · I WILL NEVER HIT YOU)"
            className={fieldClass}
          />

          {/* Signature */}
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Signature (optional)"
            className={fieldClass}
          />

          {/* Ornament Toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ornament}
              onChange={(e) => setOrnament(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Show star ornament</span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={download}
              disabled={isDownloading}
              className="flex-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-all hover:bg-primary/90"
            >
              {isDownloading ? <ButtonSpinner /> : "Download PNG ↓"}
            </button>
            <button
              onClick={share}
              disabled={isSharing}
              className="flex-1 rounded-lg border px-5 py-2 text-sm font-medium transition-all hover:bg-accent disabled:opacity-50"
            >
              {isSharing ? <ButtonSpinner /> : "Share"}
            </button>
          </div>

          {/* Tips */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Cards are rendered at 1080×1350px (4:5 aspect ratio), perfect for social media sharing.
            </p>
          </div>
        </section>

        {/* Preview Section */}
        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="space-y-3">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Preview
            </p>
            <canvas
              ref={canvasRef}
              className="aspect-[4/5] w-full rounded-xl border shadow-sm transition-all"
              aria-label="Quote card preview"
            />
            <div className="flex items-center justify-center gap-2">
              {TEMPLATES.find((t) => t.id === template)?.icon && (
                <span>{TEMPLATES.find((t) => t.id === template)?.icon}</span>
              )}
              <span className="text-sm text-muted-foreground">
                {TEMPLATES.find((t) => t.id === template)?.name} — {TEMPLATES.find((t) => t.id === template)?.desc}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CardsPage;
