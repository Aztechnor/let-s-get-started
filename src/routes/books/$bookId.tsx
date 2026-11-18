import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicBookPage } from "@/lib/storyhouse.functions";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToastHost, toast } from "@/components/toast";

export const Route = createFileRoute("/books/$bookId")({
  loader: ({ params }) => getPublicBookPage({ data: { bookId: params.bookId } }),
  head: ({ loaderData }) => {
    const book = loaderData?.book;
    const description = book
      ? `Discover ${book.title} by ${book.author} in the early-access reading room at The Library of Alexandria.`
      : "Discover the early-access reading room at The Library of Alexandria.";

    if (!book || !loaderData?.canonicalUrl || !loaderData.coverUrl) {
      return {
        meta: [
          { title: "Book not found — The Library of Alexandria" },
          { name: "description", content: description },
          { property: "og:title", content: "The Library of Alexandria" },
          { property: "og:description", content: description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ],
      };
    }

    return {
      meta: [
        { title: `${book.title} — The Library of Alexandria` },
        { name: "description", content: book.description || description },
        { name: "author", content: book.author },
        { property: "og:title", content: book.title },
        { property: "og:description", content: book.description || description },
        { property: "og:type", content: "book" },
        { property: "og:url", content: loaderData.canonicalUrl },
        { property: "og:site_name", content: "The Library of Alexandria" },
        { property: "og:image", content: loaderData.coverUrl },
        { property: "og:image:secure_url", content: loaderData.coverUrl },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:alt", content: `Cover of ${book.title} by ${book.author}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: book.title },
        { name: "twitter:description", content: book.description || description },
        { name: "twitter:image", content: loaderData.coverUrl },
      ],
      links: [{ rel: "canonical", href: loaderData.canonicalUrl }],
    };
  },
  component: BookPage,
});

function BookPage() {
  const { book, canonicalUrl } = Route.useLoaderData();
  const [sharing, setSharing] = useState(false);

  const shareBook = async () => {
    if (!book) return;
    const url = canonicalUrl ?? window.location.href;
    const title = `${book.title} · The Library of Alexandria`;
    const message = `Discover ${book.title} by ${book.author} in the early-access reading room.`;

    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: message, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast("Book link copied. Share it with your readers.");
      } else {
        toast("Use your browser's address bar to copy this book link.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast("Sharing is unavailable in this browser. Copy the page address instead.");
      }
    } finally {
      setSharing(false);
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] text-[#242924]">
        <SiteHeader active="library" />
        <main className="mx-auto max-w-2xl px-6 py-28 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b806f]">
            The collection
          </p>
          <h1 className="mt-4 font-serif text-4xl font-normal">We couldn’t find that book.</h1>
          <p className="mt-4 text-sm leading-7 text-[#77796f]">
            This title may have moved, or the link may be incomplete.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex rounded-full bg-[#2d4039] px-6 py-3 text-sm font-semibold text-[#f7f1e5]"
          >
            Return to the library
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isSpook = book.title.toLowerCase().includes("spook");
  const palette = isSpook
    ? {
        background: "linear-gradient(135deg, #242724 0%, #49483d 52%, #755f49 100%)",
        accent: "#d0a67a",
        soft: "#e7ddcc",
      }
    : {
        background: "linear-gradient(135deg, #1d3442 0%, #365e6d 54%, #789496 100%)",
        accent: "#d6c5a2",
        soft: "#dce8e3",
      };

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#242924]">
      <ToastHost />
      <SiteHeader active="library" />

      <main>
        <section className="relative isolate overflow-hidden text-[#f3eee3]" style={{ background: palette.background }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-48 h-[36rem] w-[36rem] rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-48 left-[-7rem] h-[30rem] w-[30rem] rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:py-24">
            <div className="mx-auto w-full max-w-[390px]">
              <div className="relative rotate-[-2deg] rounded-[0.8rem] border border-white/20 bg-black/15 p-3 shadow-[0_35px_75px_rgba(0,0,0,0.42)] sm:p-4">
                <img
                  src={book.cover}
                  alt={`Cover of ${book.title}`}
                  className="block aspect-[3/4] w-full rounded-sm object-cover"
                />
                <div className="pointer-events-none absolute -right-5 -top-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#eee5d4] text-2xl text-[#4c6659] shadow-xl sm:h-16 sm:w-16 sm:text-3xl">
                  <span className="animate-pulse" aria-hidden="true">✧</span>
                </div>
              </div>
              <p className="mt-8 text-center text-[9px] uppercase tracking-[0.26em] text-white/60">
                A book to discover · Early access
              </p>
            </div>

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#cbded4]" />
                Early-access edition
              </div>
              <p className="mt-8 text-[10px] uppercase tracking-[0.27em] text-white/65">
                {book.kind} · The Library of Alexandria
              </p>
              <h1 className="mt-4 max-w-[13ch] font-serif text-5xl font-normal leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="mt-4 font-serif text-xl italic text-white/75 sm:text-2xl">
                  {book.subtitle}
                </p>
              ) : null}
              <div className="mt-7 h-px w-20" style={{ backgroundColor: palette.accent }} />
              <p className="mt-7 max-w-xl text-base leading-8 text-white/80">
                {book.description}
              </p>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/60">
                By {book.author}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/read"
                  search={{ book: book.id, chapter: 0 }}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-[#28332d] transition hover:-translate-y-0.5 hover:bg-white"
                  style={{ backgroundColor: palette.soft }}
                >
                  Read with early access <span className="ml-3" aria-hidden="true">↗</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void shareBook()}
                  disabled={sharing}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  {sharing ? "Opening share…" : "Share this book"} <span className="ml-3" aria-hidden="true">↗</span>
                </button>
              </div>
              <p className="mt-5 text-xs leading-6 text-white/55">
                Reader access is by invitation. If you have been approved, sign in with your invited email address.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_1fr] lg:gap-20 lg:py-24">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b806f]">
              Inside the book
            </p>
            <h2 className="mt-3 font-serif text-3xl font-normal text-[#29322d] sm:text-4xl">
              A little of what awaits.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#77796f]">
              Browse the chapter titles before you enter. The full reading experience is reserved for invited readers.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e2dacc] bg-[#fbf8f1] p-5">
                <p className="font-serif text-3xl text-[#2d4039]">{book.chapters.length}</p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8b806f]">
                  Chapters
                </p>
              </div>
              <div className="rounded-2xl border border-[#e2dacc] bg-[#fbf8f1] p-5">
                <p className="font-serif text-3xl text-[#2d4039]">{book.story_count}</p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8b806f]">
                  Stories
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4 border-b border-[#dcd3c4] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b806f]">
                  The contents
                </p>
                <h3 className="mt-2 font-serif text-2xl font-normal text-[#29322d]">
                  Chapter guide
                </h3>
              </div>
              <span className="text-[10px] text-[#8b806f]">
                {book.chapters.length} chapters
              </span>
            </div>
            <ol className="divide-y divide-[#e2dacc]">
              {book.chapters.slice(0, 8).map((chapter) => (
                <li key={chapter.index} className="flex items-center gap-4 py-4">
                  <span className="w-7 shrink-0 font-serif text-sm text-[#a59a87]">
                    {String(chapter.index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-[#39443d]">{chapter.title}</span>
                  <span className="shrink-0 text-[10px] text-[#9a9080]">
                    {chapter.minutes} min
                  </span>
                </li>
              ))}
            </ol>
            {book.chapters.length > 8 ? (
              <p className="pt-4 text-[10px] text-[#8b806f]">
                {book.chapters.length - 8} more chapters are waiting inside.
              </p>
            ) : null}
          </div>
        </section>

        <section className="border-y border-[#e2dacc] bg-[#ece5d8] px-6 py-14 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b806f]">
            The Library of Alexandria
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-normal leading-tight text-[#29322d] sm:text-4xl">
            Stories are better when you have a place to return to.
          </h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex rounded-full border border-[#cfc5b4] px-6 py-3 text-sm font-medium text-[#39443d] transition hover:bg-white/60"
            >
              Explore both books
            </Link>
            <Link
              to="/read"
              search={{ book: book.id, chapter: 0 }}
              className="inline-flex rounded-full bg-[#2d4039] px-6 py-3 text-sm font-semibold text-[#f7f1e5] transition hover:bg-[#405c50]"
            >
              Enter the reading room
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
