import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { getLibrary } from "@/lib/storyhouse.functions";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";

type Book = Awaited<ReturnType<typeof getLibrary>>["books"][number];

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Share the books — The Library of Alexandria" },
      {
        name: "description",
        content: "Discover Under Blue Skies and SPOOK. Create and share an early-access book card.",
      },
      { property: "og:title", content: "Share the books — The Library of Alexandria" },
      {
        property: "og:description",
        content: "Two books. Worlds to get lost in. Discover the early-access reading room.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getLibrary(),
  component: CardsPage,
});

function bookPalette(book: Book) {
  const isSpook = book.title.toLowerCase().includes("spook");
  return isSpook
    ? {
        background: "linear-gradient(135deg, #242724 0%, #49483d 52%, #755f49 100%)",
        start: "#252925",
        end: "#766048",
        glow: "#b28b62",
        ink: "#f3eadb",
        muted: "#d1c4b1",
        accent: "#d0a67a",
      }
    : {
        background: "linear-gradient(135deg, #1d3442 0%, #365e6d 54%, #789496 100%)",
        start: "#1d3442",
        end: "#789496",
        glow: "#83bac3",
        ink: "#f3f1e7",
        muted: "#d4e0dc",
        accent: "#d6c5a2",
      };
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadCover(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The book cover could not be loaded."));
    image.src = src;
    if (image.complete && image.naturalWidth > 0) resolve(image);
  });
}

async function paintBookCard(canvas: HTMLCanvasElement, book: Book) {
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create a share image.");

  const palette = bookPalette(book);
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, palette.start);
  gradient.addColorStop(1, palette.end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(880, 370, 40, 800, 530, 700);
  glow.addColorStop(0, palette.glow + "66");
  glow.addColorStop(1, palette.glow + "00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1100);

  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, 996, 1266);

  ctx.fillStyle = palette.muted;
  ctx.font = "600 19px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("THE LIBRARY OF ALEXANDRIA", 92, 112);

  ctx.textAlign = "right";
  ctx.font = "600 16px Arial, sans-serif";
  ctx.fillText("EARLY ACCESS", 988, 112);

  ctx.textAlign = "left";
  ctx.fillStyle = palette.accent;
  ctx.fillRect(92, 180, 96, 4);

  ctx.fillStyle = palette.ink;
  ctx.font = "500 74px Georgia, serif";
  const titleLines = wrapCanvasText(ctx, book.title, 405).slice(0, 3);
  let titleY = 315;
  for (const line of titleLines) {
    ctx.fillText(line, 92, titleY, 420);
    titleY += 88;
  }

  ctx.fillStyle = palette.muted;
  ctx.font = "600 20px Arial, sans-serif";
  ctx.fillText(("BY " + book.author).toUpperCase(), 94, titleY + 16, 420);

  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.font = "29px Georgia, serif";
  const descriptionLines = wrapCanvasText(ctx, book.description, 410).slice(0, 5);
  let descriptionY = titleY + 104;
  for (const line of descriptionLines) {
    ctx.fillText(line, 94, descriptionY, 420);
    descriptionY += 43;
  }

  try {
    const cover = await loadCover(book.cover);
    const coverX = 565;
    const coverY = 225;
    const coverW = 405;
    const coverH = 570;
    const scale = Math.max(coverW / cover.naturalWidth, coverH / cover.naturalHeight);
    const drawW = cover.naturalWidth * scale;
    const drawH = cover.naturalHeight * scale;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.48)";
    ctx.shadowBlur = 42;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 28;
    ctx.fillStyle = "#101512";
    ctx.fillRect(coverX - 8, coverY - 8, coverW + 16, coverH + 16);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(coverX, coverY, coverW, coverH);
    ctx.clip();
    ctx.drawImage(
      cover,
      coverX + (coverW - drawW) / 2,
      coverY + (coverH - drawH) / 2,
      drawW,
      drawH,
    );
    ctx.restore();
  } catch {
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(565, 225, 405, 570);
    ctx.fillStyle = palette.ink;
    ctx.font = "48px Georgia, serif";
    ctx.fillText(book.title, 600, 470, 330);
  }

  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(92, 930, 896, 1);
  ctx.fillStyle = palette.ink;
  ctx.font = "italic 36px Georgia, serif";
  ctx.fillText("A story is waiting for you.", 92, 1010);

  ctx.fillStyle = palette.muted;
  ctx.font = "600 17px Arial, sans-serif";
  ctx.fillText("PRIVATE READING ROOM  ·  INVITATION ACCESS", 94, 1067);

  ctx.fillStyle = palette.accent;
  ctx.font = "600 20px Arial, sans-serif";
  ctx.fillText("DISCOVER THE COLLECTION", 94, 1190);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.muted;
  ctx.font = "600 15px Arial, sans-serif";
  ctx.fillText("STORIES THAT STAY", 986, 1190);
  ctx.textAlign = "left";
}

async function makeBookCardImage(book: Book): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  await paintBookCard(canvas, book);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "book";
}

function shareUrl(book: Book) {
  return window.location.origin + "/books/" + encodeURIComponent(book.id);
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function BookShareCard({ book }: { book: Book }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const palette = bookPalette(book);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void paintBookCard(canvas, book).catch(() => undefined);
  }, [book]);

  const downloadCard = async () => {
    try {
      const blob = await makeBookCardImage(book);
      if (!blob) {
        toast("The book card could not be created in this browser.");
        return;
      }
      downloadBlob(blob, safeFileName(book.title) + "-library-card.png");
      toast("Your 1080 × 1350 book card is ready.");
    } catch {
      toast("The book card could not be created. Please try again.");
    }
  };

  const copyLink = async () => {
    const url = shareUrl(book);
    try {
      await navigator.clipboard.writeText(url);
      toast("Reading link copied.");
    } catch {
      toast("Copying is blocked in this browser. Use the share button instead.");
    }
  };

  const shareCard = async () => {
    try {
      const blob = await makeBookCardImage(book);
      if (!blob) {
        toast("The book card could not be created.");
        return;
      }
      const file = new File([blob], safeFileName(book.title) + "-library-card.png", {
        type: "image/png",
      });
      const url = shareUrl(book);
      const title = book.title + " · The Library of Alexandria";
      const message = "Discover " + book.title + " by " + book.author + " in the early-access reading room.";

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: message, url });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text: message, url });
        return;
      }

      downloadBlob(blob, safeFileName(book.title) + "-library-card.png");
      await navigator.clipboard.writeText(url);
      toast("Card downloaded and reading link copied. Attach the image when posting.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("The share sheet could not be opened. Download the card and share it manually.");
    }
  };

  const openSocial = (network: "whatsapp" | "facebook" | "x") => {
    const url = shareUrl(book);
    const text =
      "Discover " +
      book.title +
      " by " +
      book.author +
      " — early access at The Library of Alexandria.";
    const destinations = {
      whatsapp: "https://wa.me/?text=" + encodeURIComponent(text + " " + url),
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
      x:
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(text) +
        "&url=" +
        encodeURIComponent(url),
    };
    window.open(destinations[network], "_blank", "noopener,noreferrer");
  };

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#ded5c5] bg-[#fbf8f1] shadow-[0_18px_50px_rgba(56,48,36,0.09)]">
      <div className="p-4 sm:p-6" style={{ background: palette.background }}>
        <canvas
          ref={canvasRef}
          className="block aspect-[4/5] w-full rounded-[1.25rem] border border-white/15 shadow-[0_18px_42px_rgba(0,0,0,0.24)]"
          aria-label={"Shareable book card for " + book.title}
        />
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a806f]">
              Share this title
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#2a312d]">
              {book.title}
            </h2>
            <p className="mt-1 text-xs text-[#7a7b72]">By {book.author}</p>
          </div>
          <span className="rounded-full border border-[#cfc5b4] bg-[#f3eee4] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#526a61]">
            Early access
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void shareCard()}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#2f443b] px-4 py-3 text-xs font-semibold text-[#f8f2e7] transition hover:bg-[#435e50] sm:col-span-1"
          >
            Share card <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            onClick={() => void downloadCard()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cebd] px-4 py-3 text-xs font-semibold text-[#39433c] transition hover:bg-[#f1ebdf]"
          >
            Download image <span aria-hidden="true">↓</span>
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cebd] px-4 py-3 text-xs font-semibold text-[#39433c] transition hover:bg-[#f1ebdf]"
          >
            Copy reading link <span aria-hidden="true">⧉</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e7dfd2] pt-4">
          <span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#918675]">
            Share to
          </span>
          <button
            type="button"
            onClick={() => openSocial("whatsapp")}
            className="text-xs font-medium text-[#526a61] transition hover:text-[#26342d]"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => openSocial("facebook")}
            className="text-xs font-medium text-[#526a61] transition hover:text-[#26342d]"
          >
            Facebook
          </button>
          <button
            type="button"
            onClick={() => openSocial("x")}
            className="text-xs font-medium text-[#526a61] transition hover:text-[#26342d]"
          >
            X
          </button>
          <span className="ml-auto text-[10px] text-[#979083]">
            Instagram · use your device share sheet
          </span>
        </div>
      </div>
    </article>
  );
}

function CardsPage() {
  const { books } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#242924]">
      <ToastHost />
      <SiteHeader active="cards" />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-12 sm:px-10 lg:pt-16">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b806f]">
            Pass a story along
          </p>
          <h1 className="mt-4 font-serif text-4xl font-normal leading-tight tracking-tight text-[#28302c] sm:text-5xl">
            Good stories deserve to travel.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#77796f]">
            Each book has its own share card. Send the image to a friend, post
            it to your socials, or share a direct reading link with someone
            who has early access.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          {books.map((book) => (
            <BookShareCard key={book.id} book={book} />
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-2xl border-t border-[#ded5c5] pt-8 text-center">
          <p className="font-serif text-2xl text-[#39443d]">
            Two books. One place to begin.
          </p>
          <p className="mt-2 text-xs leading-6 text-[#858174]">
            Reading access is invitation-only. Sharing a card does not share
            the book file or unlock a reader account.
          </p>
        </div>
      </main>
    </div>
  );
}
