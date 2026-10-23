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

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getLibrary,
  getMe,
  getStoryChapter,
  requestCode,
  searchTheLibrary,
  verifyCode,
} from "@/lib/storyhouse.functions";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";

type Books = Awaited<ReturnType<typeof getLibrary>>["books"];
type Story = Awaited<ReturnType<typeof getStoryChapter>>;
type Hit = Awaited<ReturnType<typeof searchTheLibrary>>["results"][number];

function ReadPage() {
  const [me, setMe] = useState<Awaited<ReturnType<typeof getMe>> | null>(null);
  const [books, setBooks] = useState<Books>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [fontSize, setFontSize] = useState(18);

  const getMeFn = useServerFn(getMe);
  const getLibraryFn = useServerFn(getLibrary);
  const getStoryFn = useServerFn(getStoryChapter);
  const searchFn = useServerFn(searchTheLibrary);

  useEffect(() => {
    getMeFn().then(setMe).catch(() => setMe({ authenticated: false, email: "", role: "" }));
  }, [getMeFn]);

  useEffect(() => {
    if (!me?.authenticated) return;
    getLibraryFn().then((r) => setBooks(r.books)).catch(() => setBooks([]));
  }, [me?.authenticated, getLibraryFn]);

  const book = books.find((b) => b.id === bookId) ?? null;

  useEffect(() => {
    if (!bookId) return;
    getStoryFn({ data: { bookId, chapterIndex } })
      .then(setStory)
      .catch((e) => toast(e instanceof Error ? e.message : "Could not open that story."));
  }, [bookId, chapterIndex, getStoryFn]);

  // Debounced full-text search once a query is long enough.
  useEffect(() => {
    if (!me?.authenticated) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      searchFn({ data: { q: trimmed } }).then((r) => setHits(r.results)).catch(() => setHits([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, me?.authenticated, searchFn]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader active="read" />
      {!me?.authenticated ? (
        <ReaderGate me={me} onSignedIn={() => getMeFn().then(setMe)} />
      ) : (
        <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {books.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBookId(b.id);
                    setChapterIndex(0);
                  }}
                  className={
                    "rounded-full border px-4 py-2 text-sm transition-colors " +
                    (bookId === b.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")
                  }
                >
                  {b.title}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Smaller text" className="rounded-md border px-2 py-1" onClick={() => setFontSize((f) => Math.max(14, f - 2))}>
                A−
              </button>
              <button aria-label="Larger text" className="rounded-md border px-2 py-1" onClick={() => setFontSize((f) => Math.min(26, f + 2))}>
                A+
              </button>
            </div>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search every story…"
            className="mt-6 w-full rounded-lg border border-input bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          {hits.length > 0 && (
            <ul className="mt-3 divide-y rounded-lg border bg-card">
              {hits.map((h, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <button
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={() => {
                      setBookId(h.book_id);
                      setChapterIndex(h.chapter_index);
                      setQuery("");
                    }}
                  >
                    {h.chapter_title} — {h.book_title}
                  </button>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{h.excerpt}</p>
                </li>
              ))}
            </ul>
          )}

          {!book && me.authenticated && (
            <p className="mt-16 text-center text-sm text-muted-foreground">Choose a book above to start reading.</p>
          )}

          {book && !story && <p className="mt-16 text-center text-sm text-muted-foreground">Opening the first story…</p>}

          {book && story && (
            <article className="mt-10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {story.book.title} · Story {story.chapter.index + 1}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{story.chapter.title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {story.chapter.word_count.toLocaleString()} words · about {story.chapter.minutes} min
              </p>
              <div style={{ fontSize }} className="mt-8 space-y-5 leading-relaxed">
                {story.chapter.text.split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="mt-12 flex items-center justify-between border-t pt-6">
                <button
                  disabled={chapterIndex === 0}
                  onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
                  className="rounded-md border px-4 py-2 text-sm disabled:opacity-40"
                >
                  ← Previous
                </button>
                <a
                  href={`/api/public/read/pdf?book=${story.book.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                  Open the full PDF
                </a>
                <button
                  disabled={chapterIndex >= book.chapters.length - 1}
                  onClick={() => setChapterIndex((i) => Math.min(book.chapters.length - 1, i + 1))}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </article>
          )}
        </main>
      )}
    </div>
  );
}

function ReaderGate({
  me,
  onSignedIn,
}: {
  me: Awaited<ReturnType<typeof getMe>> | null;
  onSignedIn: () => void;
}) {
  const requestFn = useServerFn(requestCode);
  const verifyFn = useServerFn(verifyCode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCodeNow = async () => {
    setBusy(true);
    try {
      const r = await requestFn({ data: { email } });
      setMessage(r.message);
      setStep("code");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verifyNow = async () => {
    setBusy(true);
    try {
      await verifyFn({ data: { email, code } });
      onSignedIn();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-24 pt-16">
      <h1 className="text-3xl font-semibold">Reader access</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The room is invite-only. Enter your email and we&apos;ll send a six-digit sign-in code if you&apos;re on the list.
      </p>
      <div className="mt-8 space-y-4 rounded-xl border bg-card p-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {step === "code" && (
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Six-digit code"
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-center text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        <button
          disabled={busy}
          onClick={step === "email" ? requestCodeNow : verifyNow}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "One moment…" : step === "email" ? "Send my code" : "Sign in"}
        </button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
      {me && !me.authenticated && step === "email" ? null : null}
    </main>
  );
}

