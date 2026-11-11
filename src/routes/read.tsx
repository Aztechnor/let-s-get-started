import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Reader access — Storyhouse" },
      { name: "description", content: "A quieter, more personal way to read Under Blue Skies and SPOOK." },
      { property: "og:title", content: "Reader access — Storyhouse" },
      { property: "og:description", content: "A quieter, more personal way to read Under Blue Skies and SPOOK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReadPage,
});

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Moon,
  Palette,
  Search,
  Settings2,
  Sun,
  Type,
  X,
} from "lucide-react";
import {
  getLibrary,
  getMe,
  getMyProgress,
  getStoryChapter,
  requestCode,
  saveMyProgress,
  searchTheLibrary,
  verifyCode,
  type ProgressRow,
} from "@/lib/storyhouse.functions";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";
import {
  DEFAULT_READER_PREFERENCES,
  READER_BOOKMARKS_KEY,
  READER_PREFERENCES_KEY,
  parseReaderBookmarks,
  parseReaderPreferences,
  parseReaderScrollPosition,
  readerPositionKey,
  toggleReaderBookmark,
  type ReaderBookmark,
  type ReaderPreferences,
  type ReaderTheme,
} from "@/lib/reader-local-state";

type Books = Awaited<ReturnType<typeof getLibrary>>["books"];
type Story = Awaited<ReturnType<typeof getStoryChapter>>;
type Hit = Awaited<ReturnType<typeof searchTheLibrary>>["results"][number];

const themeClasses: Record<ReaderTheme, { page: string; panel: string; text: string; muted: string; border: string; accent: string }> = {
  paper: {
    page: "bg-[#f7f5ef]",
    panel: "bg-white/75",
    text: "text-[#343a34]",
    muted: "text-[#85877e]",
    border: "border-[#e4e0d6]",
    accent: "bg-[#3e5144] text-white",
  },
  sepia: {
    page: "bg-[#eee2cf]",
    panel: "bg-[#f8efdf]",
    text: "text-[#493c2f]",
    muted: "text-[#897764]",
    border: "border-[#dfceb6]",
    accent: "bg-[#71563c] text-[#fff8ec]",
  },
  night: {
    page: "bg-[#171b1a]",
    panel: "bg-[#222826]",
    text: "text-[#e8e1d4]",
    muted: "text-[#a7a99e]",
    border: "border-[#353d38]",
    accent: "bg-[#c5b58f] text-[#20251f]",
  },
};

const widthValues: Record<ReaderPreferences["contentWidth"], string> = {
  narrow: "620px",
  medium: "760px",
  wide: "920px",
};

const lineHeightValues: Record<ReaderPreferences["lineSpacing"], number> = {
  comfortable: 1.65,
  relaxed: 1.9,
  airy: 2.15,
};

function ReadPage() {
  const [me, setMe] = useState<Awaited<ReturnType<typeof getMe>> | null>(null);
  const [books, setBooks] = useState<Books>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences>({ ...DEFAULT_READER_PREFERENCES });
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [localStateReady, setLocalStateReady] = useState(false);

  const getMeFn = useServerFn(getMe);
  const getLibraryFn = useServerFn(getLibrary);
  const getStoryFn = useServerFn(getStoryChapter);
  const searchFn = useServerFn(searchTheLibrary);
  const getProgressFn = useServerFn(getMyProgress);
  const saveProgressFn = useServerFn(saveMyProgress);

  useEffect(() => {
    getMeFn().then(setMe).catch(() => setMe({ authenticated: false, email: "", role: "" }));
  }, [getMeFn]);

  useEffect(() => {
    try {
      const rawPreferences = window.localStorage.getItem(READER_PREFERENCES_KEY);
      const rawBookmarks = window.localStorage.getItem(READER_BOOKMARKS_KEY);
      setPreferences(rawPreferences ? parseReaderPreferences(JSON.parse(rawPreferences)) : { ...DEFAULT_READER_PREFERENCES });
      setBookmarks(rawBookmarks ? parseReaderBookmarks(JSON.parse(rawBookmarks)) : []);
    } catch {
      setPreferences({ ...DEFAULT_READER_PREFERENCES });
      setBookmarks([]);
    } finally {
      setLocalStateReady(true);
    }
  }, []);

  useEffect(() => {
    if (!localStateReady) return;
    try {
      window.localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(preferences));
      window.localStorage.setItem(READER_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // Private browsing and storage quotas must not block the reading experience.
    }
  }, [preferences, bookmarks, localStateReady]);

  useEffect(() => {
    if (!me?.authenticated) return;
    getLibraryFn().then((result) => setBooks(result.books)).catch(() => setBooks([]));
    getProgressFn().then((result) => setProgress(result.progress)).catch(() => setProgress([]));
  }, [me?.authenticated, getLibraryFn, getProgressFn]);

  const book = books.find((entry) => entry.id === bookId) ?? null;
  const currentBookmarkId = book && story ? `${book.id}:${story.chapter.index}` : "";
  const isBookmarked = currentBookmarkId ? bookmarks.some((entry) => entry.id === currentBookmarkId) : false;
  const palette = themeClasses[preferences.theme];

  const activeReading = useMemo(
    () => progress.reduce((latest, row) => {
      if (!latest || new Date(row.updated_at).getTime() > new Date(latest.updated_at).getTime()) return row;
      return latest;
    }, undefined as ProgressRow | undefined),
    [progress],
  );

  const openBook = (id: string) => {
    const saved = progress.find((entry) => entry.book_id === id);
    setStory(null);
    setBookId(id);
    setChapterIndex(saved?.chapter_index ?? 0);
  };

  const openBookmark = (bookmark: ReaderBookmark) => {
    setBookId(bookmark.bookId);
    setChapterIndex(bookmark.chapterIndex);
    setStory(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const saveCurrentBookmark = () => {
    if (!story) return;
    const entry: ReaderBookmark = {
      id: `${story.book.id}:${story.chapter.index}`,
      bookId: story.book.id,
      bookTitle: story.book.title,
      chapterIndex: story.chapter.index,
      chapterTitle: story.chapter.title,
      createdAt: new Date().toISOString(),
    };
    const result = toggleReaderBookmark(bookmarks, entry);
    setBookmarks(result.bookmarks);
    toast(result.saved ? "Chapter saved to your bookmarks." : "Bookmark removed.");
  };

  useEffect(() => {
    if (!bookId) return;
    let current = true;
    setStory(null);
    getStoryFn({ data: { bookId, chapterIndex } })
      .then((result) => {
        if (!current) return;
        setStory(result);
        saveProgressFn({ data: { bookId, chapterIndex } })
          .then(() => getProgressFn())
          .then((response) => {
            if (current) setProgress(response.progress);
          })
          .catch(() => undefined);
      })
      .catch((error) => {
        if (current) toast(error instanceof Error ? error.message : "Could not open that story.");
      });
    return () => {
      current = false;
    };
  }, [bookId, chapterIndex, getStoryFn, saveProgressFn, getProgressFn]);

  // Remember the actual reading position on this device, independently for each chapter.
  useEffect(() => {
    if (!story || !bookId || !localStateReady) return;
    const key = readerPositionKey(bookId, chapterIndex);
    try {
      const savedPosition = parseReaderScrollPosition(window.localStorage.getItem(key));
      window.scrollTo({ top: savedPosition, behavior: "auto" });
    } catch {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    let timer: number | undefined;
    const persistNow = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      try {
        window.localStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // A storage failure should never interrupt reading.
      }
    };
    const persistSoon = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(persistNow, 300);
    };

    window.addEventListener("scroll", persistSoon, { passive: true });
    window.addEventListener("pagehide", persistNow);
    return () => {
      window.removeEventListener("scroll", persistSoon);
      window.removeEventListener("pagehide", persistNow);
      persistNow();
    };
  }, [story, bookId, chapterIndex, localStateReady]);

  // Debounced search; stale responses are ignored when the query changes.
  useEffect(() => {
    if (!me?.authenticated) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setSearchBusy(false);
      setSearchComplete(false);
      return;
    }
    let current = true;
    setSearchBusy(true);
    const timer = window.setTimeout(() => {
      searchFn({ data: { q: trimmed } })
        .then((result) => {
          if (!current) return;
          setHits(result.results);
          setSearchComplete(true);
        })
        .catch(() => {
          if (!current) return;
          setHits([]);
          setSearchComplete(true);
        })
        .finally(() => {
          if (current) setSearchBusy(false);
        });
    }, 300);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [query, me?.authenticated, searchFn]);

  const shownProgress = book ? progress.find((entry) => entry.book_id === book.id) : undefined;
  const readingPercentage = book
    ? Math.round((((shownProgress?.furthest_index ?? -1) + 1) / book.chapters.length) * 100)
    : 0;

  return (
    <div className={`min-h-screen ${palette.page} ${palette.text} transition-colors duration-200`}>
      <div className={preferences.theme === "night" ? "bg-[#f7f5ef]" : ""}>
        <SiteHeader active="read" />
      </div>
      <ToastHost />
      {me === null ? (
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${palette.border}`}>
            <BookOpen className="h-5 w-5" />
          </div>
          <p className={`mt-4 text-sm ${palette.muted}`}>Opening your reading room…</p>
        </main>
      ) : !me.authenticated ? (
        <ReaderGate onSignedIn={() => getMeFn().then(setMe)} />
      ) : (
        <main className="mx-auto w-full px-5 pb-24 pt-8 sm:px-8" style={{ maxWidth: "1120px" }}>
          <div className="flex flex-col gap-5 border-b pb-6" style={{ borderColor: preferences.theme === "night" ? "#353d38" : preferences.theme === "sepia" ? "#dfceb6" : "#e4e0d6" }}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${palette.muted}`}>Your private reading room</p>
                <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Make yourself at home.</h1>
                <p className={`mt-2 text-xs ${palette.muted}`}>Your settings, bookmarks and reading place are saved on this device.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <details className="relative">
                  <summary className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${palette.border} ${palette.panel}`}>
                    <Settings2 className="h-4 w-4" /> Reading settings <ChevronDown className="h-3 w-3" />
                  </summary>
                  <div className={`absolute right-0 z-30 mt-2 w-[min(88vw,330px)] rounded-2xl border p-4 shadow-xl ${palette.panel} ${palette.border}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Reading preferences</p>
                      <button type="button" onClick={() => setPreferences({ ...DEFAULT_READER_PREFERENCES })} className={`text-[10px] underline underline-offset-2 ${palette.muted}`}>Reset</button>
                    </div>
                    <label className="mt-4 block text-xs">
                      <span className={palette.muted}>Page tone</span>
                      <select value={preferences.theme} onChange={(event) => setPreferences((current) => ({ ...current, theme: event.target.value as ReaderTheme }))} className={`mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 ${palette.border}`}>
                        <option value="paper">Paper</option>
                        <option value="sepia">Sepia</option>
                        <option value="night">Night</option>
                      </select>
                    </label>
                    <label className="mt-3 block text-xs">
                      <span className={palette.muted}>Typeface</span>
                      <select value={preferences.font} onChange={(event) => setPreferences((current) => ({ ...current, font: event.target.value as ReaderPreferences["font"] }))} className={`mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 ${palette.border}`}>
                        <option value="serif">Literary serif</option>
                        <option value="sans">Clean sans-serif</option>
                      </select>
                    </label>
                    <label className="mt-3 block text-xs">
                      <span className={palette.muted}>Text size · {preferences.fontSize}px</span>
                      <input type="range" min={14} max={30} step={1} value={preferences.fontSize} onChange={(event) => setPreferences((current) => ({ ...current, fontSize: Number(event.target.value) }))} className="mt-2 w-full accent-[#74856d]" />
                    </label>
                    <label className="mt-3 block text-xs">
                      <span className={palette.muted}>Line spacing</span>
                      <select value={preferences.lineSpacing} onChange={(event) => setPreferences((current) => ({ ...current, lineSpacing: event.target.value as ReaderPreferences["lineSpacing"] }))} className={`mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 ${palette.border}`}>
                        <option value="comfortable">Comfortable</option>
                        <option value="relaxed">Relaxed</option>
                        <option value="airy">Airy</option>
                      </select>
                    </label>
                    <label className="mt-3 block text-xs">
                      <span className={palette.muted}>Reading column</span>
                      <select value={preferences.contentWidth} onChange={(event) => setPreferences((current) => ({ ...current, contentWidth: event.target.value as ReaderPreferences["contentWidth"] }))} className={`mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 ${palette.border}`}>
                        <option value="narrow">Narrow</option>
                        <option value="medium">Medium</option>
                        <option value="wide">Wide</option>
                      </select>
                    </label>
                  </div>
                </details>

                <details className="relative">
                  <summary className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${palette.border} ${palette.panel}`}>
                    <Bookmark className="h-4 w-4" /> Saved chapters <span className="rounded-full bg-black/5 px-1.5 py-0.5 tabular-nums">{bookmarks.length}</span>
                  </summary>
                  <div className={`absolute right-0 z-30 mt-2 max-h-[65vh] w-[min(88vw,360px)] overflow-y-auto rounded-2xl border p-3 shadow-xl ${palette.panel} ${palette.border}`}>
                    <p className="px-2 pb-2 text-sm font-semibold">Your bookmarks</p>
                    {bookmarks.length ? bookmarks.map((entry) => (
                      <div key={entry.id} className={`flex items-start gap-2 rounded-xl p-2 hover:bg-black/5`}>
                        <button type="button" onClick={() => openBookmark(entry)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-xs font-semibold">{entry.chapterTitle}</span>
                          <span className={`mt-1 block truncate text-[10px] ${palette.muted}`}>{entry.bookTitle} · Chapter {entry.chapterIndex + 1}</span>
                        </button>
                        <button type="button" aria-label={`Remove bookmark ${entry.chapterTitle}`} onClick={() => setBookmarks((current) => current.filter((item) => item.id !== entry.id))} className={`rounded-full p-1 ${palette.muted}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )) : <p className={`px-2 py-5 text-center text-xs ${palette.muted}`}>Save chapters here to return to them later.</p>}
                  </div>
                </details>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {books.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openBook(entry.id)}
                  aria-pressed={bookId === entry.id}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${bookId === entry.id ? palette.accent : `${palette.border} ${palette.panel}`}`}
                >
                  {entry.title}
                </button>
              ))}
              {activeReading && !bookId && (
                <span className={`ml-auto inline-flex items-center gap-1.5 text-[10px] ${palette.muted}`}>
                  <Clock3 className="h-3.5 w-3.5" /> Continue from your last book
                </span>
              )}
            </div>
          </div>

          <div className="relative mt-6">
            <Search className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${palette.muted}`} />
            <input
              aria-label="Search the library"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search every story, character or phrase…"
              className={`w-full rounded-xl border px-11 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#8b9a80]/25 ${palette.border} ${palette.panel}`}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 ${palette.muted}`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {(searchBusy || hits.length > 0 || (searchComplete && query.trim().length >= 2)) && (
            <section className={`mt-3 overflow-hidden rounded-xl border ${palette.border} ${palette.panel}`} aria-live="polite">
              {searchBusy && <p className={`px-4 py-3 text-xs ${palette.muted}`}>Searching the collection…</p>}
              {!searchBusy && hits.length > 0 && hits.map((hit) => (
                <button
                  key={`${hit.book_id}:${hit.chapter_index}`}
                  type="button"
                  onClick={() => {
                    setBookId(hit.book_id);
                    setChapterIndex(hit.chapter_index);
                    setQuery("");
                  }}
                  className={`block w-full border-b px-4 py-3 text-left last:border-0 ${palette.border} hover:bg-black/5`}
                >
                  <span className="block text-xs font-semibold">{hit.chapter_title} <span className={`font-normal ${palette.muted}`}>— {hit.book_title}</span></span>
                  <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${palette.muted}`}>{hit.excerpt}</span>
                </button>
              ))}
              {!searchBusy && searchComplete && hits.length === 0 && <p className={`px-4 py-4 text-xs ${palette.muted}`}>No passages found. Try another word or phrase.</p>}
            </section>
          )}

          {!book && (
            <section className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${palette.muted}`}>The collection</p>
                  <h2 className="mt-2 font-serif text-3xl">Return to a story.</h2>
                </div>
                <span className={`text-xs ${palette.muted}`}>{books.length} books · {progress.length} reading records</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {books.map((entry) => {
                  const saved = progress.find((row) => row.book_id === entry.id);
                  const count = entry.chapters.length;
                  const percent = saved ? Math.round(((saved.furthest_index + 1) / count) * 100) : 0;
                  const currentChapter = saved ? entry.chapters[saved.chapter_index] : undefined;
                  return (
                    <button key={entry.id} type="button" onClick={() => openBook(entry.id)} className={`group flex gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${palette.border} ${palette.panel}`}>
                      <img src={entry.cover} alt={`Cover of ${entry.title}`} className="h-36 w-24 shrink-0 rounded-md object-cover shadow-md" />
                      <span className="flex min-w-0 flex-1 flex-col py-1">
                        <span className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${palette.muted}`}>{entry.kind} · {count} chapters</span>
                        <span className="mt-2 font-serif text-xl leading-tight">{entry.title}</span>
                        <span className={`mt-1 line-clamp-2 text-xs leading-5 ${palette.muted}`}>{entry.subtitle || entry.description}</span>
                        <span className="mt-auto pt-3 text-xs font-medium">
                          {saved ? `Continue: ${currentChapter?.title ?? "your last chapter"}` : "Begin reading"} <span aria-hidden="true">→</span>
                        </span>
                        <span className={`mt-2 h-1 overflow-hidden rounded-full ${preferences.theme === "night" ? "bg-white/10" : "bg-black/10"}`}>
                          <span className="block h-full rounded-full bg-[#829477]" style={{ width: `${percent}%` }} />
                        </span>
                        <span className={`mt-1 text-[9px] ${palette.muted}`}>{saved ? `${percent}% read` : "Not started"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {book && (
            <section className={`mt-8 rounded-2xl border p-4 sm:p-5 ${palette.border} ${palette.panel}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${palette.muted}`}>Now reading</p>
                  <h2 className="mt-1 truncate font-serif text-2xl">{book.title}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{readingPercentage}%</p>
                  <p className={`text-[10px] ${palette.muted}`}>furthest read</p>
                </div>
              </div>
              <div className={`mt-4 h-1.5 overflow-hidden rounded-full ${preferences.theme === "night" ? "bg-white/10" : "bg-black/10"}`}>
                <div className="h-full rounded-full bg-[#829477] transition-all" style={{ width: `${readingPercentage}%` }} />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 flex-1 items-center gap-3 text-xs">
                  <span className={`shrink-0 ${palette.muted}`}>Chapter</span>
                  <select aria-label="Jump to chapter" value={chapterIndex} onChange={(event) => setChapterIndex(Number(event.target.value))} className={`min-w-0 flex-1 rounded-lg border px-3 py-2 ${palette.border} ${palette.panel}`}>
                    {book.chapters.map((chapter, index) => (
                      <option key={index} value={index}>{String(index + 1).padStart(2, "0")} · {chapter.title}</option>
                    ))}
                  </select>
                </label>
                <span className={`text-[10px] ${palette.muted}`}>Chapter {chapterIndex + 1} of {book.chapters.length}</span>
              </div>
            </section>
          )}

          {book && !story && <p className={`py-16 text-center text-sm ${palette.muted}`}>Opening your place…</p>}

          {book && story && (
            <article className="mx-auto mt-9 pb-8" style={{ maxWidth: widthValues[preferences.contentWidth] }}>
              <header className={`border-b pb-6 ${palette.border}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[9px] font-semibold uppercase tracking-[0.19em] ${palette.muted}`}>{story.book.title} · Chapter {story.chapter.index + 1}</p>
                    <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{story.chapter.title}</h1>
                    <p className={`mt-3 text-xs ${palette.muted}`}>{story.chapter.word_count.toLocaleString()} words · about {story.chapter.minutes} min</p>
                  </div>
                  <button
                    type="button"
                    onClick={saveCurrentBookmark}
                    aria-pressed={isBookmarked}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${palette.border} ${isBookmarked ? palette.accent : ""}`}
                  >
                    {isBookmarked ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    {isBookmarked ? "Saved" : "Bookmark"}
                  </button>
                </div>
              </header>

              <div
                className="mx-auto mt-8 space-y-6"
                style={{
                  maxWidth: "720px",
                  fontSize: `${preferences.fontSize}px`,
                  lineHeight: lineHeightValues[preferences.lineSpacing],
                  fontFamily: preferences.font === "serif" ? "Georgia, 'Times New Roman', serif" : "Inter, 'Segoe UI', Arial, sans-serif",
                  color: preferences.theme === "night" ? "#e1dbcf" : preferences.theme === "sepia" ? "#574734" : "#3e4740",
                }}
              >
                {story.chapter.text.split(/\n\n+/).map((paragraph, index) => (
                  <p key={index} className="mb-0 whitespace-pre-line">{paragraph}</p>
                ))}
              </div>

              <p className={`mt-12 text-center text-[10px] italic ${palette.muted}`}>
                Your place in this chapter is remembered on this device.
              </p>

              <footer className={`mt-10 flex items-center justify-between gap-3 border-t pt-6 ${palette.border}`}>
                <button
                  type="button"
                  disabled={chapterIndex === 0}
                  onClick={() => setChapterIndex((index) => Math.max(0, index - 1))}
                  className={`rounded-full border px-4 py-2.5 text-xs font-medium disabled:opacity-30 ${palette.border}`}
                >
                  ← Previous
                </button>
                <a href={`/api/public/read/pdf?book=${story.book.id}`} target="_blank" rel="noreferrer" className={`hidden text-xs underline-offset-4 hover:underline sm:inline ${palette.muted}`}>
                  Original PDF
                </a>
                <button
                  type="button"
                  disabled={chapterIndex >= book.chapters.length - 1}
                  onClick={() => setChapterIndex((index) => Math.min(book.chapters.length - 1, index + 1))}
                  className={`rounded-full px-5 py-2.5 text-xs font-medium disabled:opacity-30 ${palette.accent}`}
                >
                  Next chapter →
                </button>
              </footer>
            </article>
          )}
        </main>
      )}
    </div>
  );
}

function ReaderGate({ onSignedIn }: { onSignedIn: () => void }) {
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
      const result = await requestFn({ data: { email } });
      setMessage(result.message);
      setStep("code");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verifyNow = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    try {
      await verifyFn({ data: { email, code } });
      onSignedIn();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-24 pt-16">
      <div className="rounded-3xl border border-[#e3ded4] bg-[#fbf9f4] p-7 shadow-[0_16px_50px_rgba(35,42,35,0.06)] sm:p-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#879083]">A private reading room</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#292d27]">Come on in.</h1>
        <p className="mt-3 text-sm leading-6 text-[#777b72]">
          Enter your invited email address. We will send a six-digit code if your address has access.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === "email") void requestCodeNow();
            else void verifyNow();
          }}
          className="mt-7 space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#62685f]">Email address</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={step === "code" || busy}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#dedbd1] bg-white px-4 py-3 text-sm outline-none focus:border-[#84927b] focus:ring-2 focus:ring-[#84927b]/15"
            />
          </label>
          {step === "code" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#62685f]">Six-digit sign-in code</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl border border-[#dedbd1] bg-white px-4 py-3 text-center font-mono text-xl tracking-[0.45em] outline-none focus:border-[#84927b] focus:ring-2 focus:ring-[#84927b]/15"
              />
            </label>
          )}
          <button type="submit" disabled={busy || (step === "code" && code.length !== 6)} className="flex w-full items-center justify-center rounded-xl bg-[#394333] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#4b5944] disabled:opacity-50">
            {busy ? "One moment…" : step === "email" ? "Send my sign-in code" : "Enter the reading room"}
          </button>
        </form>
        {message && <p aria-live="polite" className="mt-4 rounded-xl bg-[#eef0e9] px-4 py-3 text-xs leading-5 text-[#697263]">{message}</p>}
        {step === "code" && (
          <button type="button" onClick={() => { setStep("email"); setCode(""); setMessage(""); }} className="mt-4 text-xs text-[#7a8273] underline underline-offset-4">
            Use a different email address
          </button>
        )}
      </div>
    </main>
  );
}
