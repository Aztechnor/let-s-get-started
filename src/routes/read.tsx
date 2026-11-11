import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

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
import { useEffect, useState, useCallback } from "react";
import { useLoading, useDebounce } from "@/hooks/use-loading";
import { cn, formatReadingTime } from "@/lib/utils";
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
import { SiteHeader, UserIndicator } from "@/components/site-chrome";
import { toast, toastError, toastSuccess, ToastHost } from "@/components/toast";
import { Spinner, ButtonSpinner, EmptyState, ErrorState, ProgressBar, Badge } from "@/components/ui/loading";

type Books = Awaited<ReturnType<typeof getLibrary>>["books"];
type Story = Awaited<ReturnType<typeof getStoryChapter>>;
type Hit = Awaited<ReturnType<typeof searchTheLibrary>>["results"][number];

// Book cover component with fallback
function BookCover({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} className={cn("aspect-[3/4] w-full object-cover", className)} />
  ) : (
    <div
      className={cn(
        "aspect-[3/4] w-full flex items-center justify-center bg-muted rounded-lg",
        className
      )}
    >
      <span className="text-4xl text-muted-foreground">📖</span>
    </div>
  );
}

// Chapter navigation buttons
function ChapterNavButton({
  onClick,
  disabled,
  children,
  direction,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  direction: "prev" | "next";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-6 py-2 text-sm font-medium transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        direction === "next" && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
      )}
    >
      {children}
    </button>
  );
}

// Search result item
function SearchResultItem({
  hit,
  onClick,
}: {
  hit: Hit;
  onClick: () => void;
}) {
  return (
    <li className="px-4 py-3 text-sm border-b last:border-b-0 hover:bg-accent/50 transition-colors">
      <button
        className="w-full text-left font-medium underline-offset-2 hover:underline"
        onClick={onClick}
      >
        {hit.chapter_title} — {hit.book_title}
      </button>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hit.excerpt}</p>
    </li>
  );
}

// Book selection card for welcome screen
function BookWelcomeCard({
  book,
  progress,
  onClick,
}: {
  book: Books[number];
  progress: ProgressRow | undefined;
  onClick: () => void;
}) {
  const total = book.chapters.length;
  const pct = progress ? Math.round(((progress.furthest_index + 1) / total) * 100) : 0;
  const current = progress ? book.chapters[progress.chapter_index] : null;

  return (
    <button
      onClick={onClick}
      className="group rounded-xl border bg-card p-5 text-left transition-all hover:bg-accent hover:shadow-md"
    >
      <h2 className="text-lg font-semibold group-hover:text-primary">{book.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {current ? `Continue: ${current.title}` : `${total} chapters · not started`}
      </p>
      <div className="mt-4">
        <ProgressBar value={pct} max={100} showLabel />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pct > 0
          ? `${pct}% read · chapter ${(progress?.chapter_index ?? -1) + 1} of ${total}`
          : "Start reading ↗"}
      </p>
    </button>
  );
}

// Font size controls
function FontSizeControls({
  fontSize,
  setFontSize,
}: {
  fontSize: number;
  setFontSize: (size: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Smaller text"
        className="rounded-md border px-2 py-1 text-sm hover:bg-accent"
        onClick={() => setFontSize(Math.max(14, fontSize - 2))}
      >
        A⁻
      </button>
      <span className="text-sm text-muted-foreground">{fontSize}px</span>
      <button
        aria-label="Larger text"
        className="rounded-md border px-2 py-1 text-sm hover:bg-accent"
        onClick={() => setFontSize(Math.min(26, fontSize + 2))}
      >
        A⁺
      </button>
    </div>
  );
}

function ReadPage() {
  // State management
  const [me, setMe] = useState<Awaited<ReturnType<typeof getMe>> | null>(null);
  const [books, setBooks] = useState<Books>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [fontSize, setFontSize] = useState(18);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  
  // Loading states
  const [isLoadingMe, setIsLoadingMe] = useState(true);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server functions
  const getMeFn = useServerFn(getMe);
  const getLibraryFn = useServerFn(getLibrary);
  const getStoryFn = useServerFn(getStoryChapter);
  const searchFn = useServerFn(searchTheLibrary);
  const getProgressFn = useServerFn(getMyProgress);
  const saveProgressFn = useServerFn(saveMyProgress);

  // Debounced search
  const debouncedSearch = useDebounce(searchFn, 350);

  // Initialize user session
  useEffect(() => {
    const loadMe = async () => {
      setIsLoadingMe(true);
      setError(null);
      try {
        const result = await getMeFn();
        setMe(result);
      } catch {
        setMe({ authenticated: false, email: "", role: "" });
      } finally {
        setIsLoadingMe(false);
      }
    };
    loadMe();
  }, [getMeFn]);

  // Load library and progress when authenticated
  useEffect(() => {
    if (!me?.authenticated) return;
    
    const loadData = async () => {
      setIsLoadingLibrary(true);
      setIsLoadingProgress(true);
      setError(null);
      
      try {
        const [libraryResult, progressResult] = await Promise.all([
          getLibraryFn(),
          getProgressFn(),
        ]);
        setBooks(libraryResult.books);
        setProgress(progressResult.progress);
      } catch {
        setError("Failed to load your library. Please try refreshing.");
        setBooks([]);
        setProgress([]);
      } finally {
        setIsLoadingLibrary(false);
        setIsLoadingProgress(false);
      }
    };
    
    loadData();
  }, [me?.authenticated, getLibraryFn, getProgressFn]);

  const book = books.find((b) => b.id === bookId) ?? null;

  const openBook = useCallback((id: string) => {
    const saved = progress.find((p) => p.book_id === id);
    setStory(null);
    setBookId(id);
    setChapterIndex(saved?.chapter_index ?? 0);
  }, [progress]);

  // Load story chapter
  useEffect(() => {
    if (!bookId) return;
    
    const loadStory = async () => {
      setIsLoadingStory(true);
      setError(null);
      
      try {
        const result = await getStoryFn({ data: { bookId, chapterIndex } });
        setStory(result);
        window.scrollTo({ top: 0 });
        
        // Save progress
        try {
          await saveProgressFn({ data: { bookId, chapterIndex } });
          const progressResult = await getProgressFn();
          setProgress(progressResult.progress);
        } catch {
          // Progress save failed, but continue
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open that story.");
        setStory(null);
      } finally {
        setIsLoadingStory(false);
      }
    };
    
    loadStory();
  }, [bookId, chapterIndex, getStoryFn, saveProgressFn, getProgressFn]);

  // Debounced search
  useEffect(() => {
    if (!me?.authenticated) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    
    const search = async () => {
      try {
        const result = await debouncedSearch({ data: { q: trimmed } });
        setHits(result.results);
      } catch {
        setHits([]);
      }
    };
    
    search();
  }, [query, me?.authenticated, debouncedSearch]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setError(null);
    try {
      const [meResult, libraryResult, progressResult] = await Promise.all([
        getMeFn(),
        getLibraryFn(),
        getProgressFn(),
      ]);
      setMe(meResult);
      setBooks(libraryResult.books);
      setProgress(progressResult.progress);
      toastSuccess("Refreshed successfully");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [getMeFn, getLibraryFn, getProgressFn]);

  // Handle code request error with better UX
  const handleRequestCodeError = useCallback((e: unknown) => {
    const message = e instanceof Error ? e.message : "Could not request sign-in code";
    if (message.includes("EMAIL_NOT_CONFIGURED") || message.includes("not configured")) {
      toast("Email not configured. In development, check the console for your code.");
    } else {
      toastError(message);
    }
  }, []);

  // Render loading state
  if (isLoadingMe) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <SiteHeader active="read" />
        <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16">
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Spinner size="lg" />
            <p className="text-muted-foreground">Checking your session...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render the main content
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader
        active="read"
        right={me?.authenticated ? <UserIndicator email={me.email} /> : null}
      />

      {!me?.authenticated ? (
        <ReaderGate
          me={me}
          onSignedIn={() => {
            setMe(null);
            // Re-fetch me after sign in
            getMeFn().then(setMe).catch(() => setMe({ authenticated: false, email: "", role: "" }));
          }}
          onError={handleRequestCodeError}
        />
      ) : (
        <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-10">
          {/* Error display */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header with book selector and controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {isLoadingLibrary ? (
                <Spinner size="sm" />
              ) : (
                books.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openBook(b.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-all",
                      bookId === b.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {b.title}
                  </button>
                ))
              )}
            </div>
            <FontSizeControls fontSize={fontSize} setFontSize={setFontSize} />
          </div>

          {/* Search */}
          <div className="mt-6">
            <label htmlFor="search" className="sr-only">
              Search every story
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
              <input
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search every story…"
                className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Search results */}
          {hits.length > 0 && (
            <ul className="mt-3 divide-y rounded-xl border bg-card">
              {hits.map((h, i) => (
                <SearchResultItem
                  key={i}
                  hit={h}
                  onClick={() => {
                    setBookId(h.book_id);
                    setChapterIndex(h.chapter_index);
                    setQuery("");
                  }}
                />
              ))}
            </ul>
          )}

          {/* Welcome screen - no book selected */}
          {!book && me.authenticated && (
            <section className="mt-10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {progress.length ? "Welcome back — pick up where you left off" : "Choose a book to start reading"}
              </p>
              
              {isLoadingLibrary ? (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <BookCardSkeleton />
                  <BookCardSkeleton />
                </div>
              ) : books.length === 0 ? (
                <EmptyState
                  title="No books available"
                  description="The library appears to be empty. Check back later for new stories."
                  action={<button onClick={refreshData} className="btn btn-sm">Refresh</button>}
                />
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {books.map((b) => {
                    const p = progress.find((row) => row.book_id === b.id);
                    return (
                      <BookWelcomeCard
                        key={b.id}
                        book={b}
                        progress={p}
                        onClick={() => openBook(b.id)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Book selected - show progress */}
          {book && (
            <div className="mt-8 space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Your progress in {book.title}</span>
                <span>
                  {chapterIndex + 1} / {book.chapters.length}
                </span>
              </div>
              <ProgressBar
                value={chapterIndex + 1}
                max={book.chapters.length}
                showLabel
              />
              
              <select
                aria-label="Jump to chapter"
                value={chapterIndex}
                onChange={(e) => setChapterIndex(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                {book.chapters.map((c, i) => (
                  <option key={i} value={i}>
                    {String(i + 1).padStart(2, "0")} · {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Loading story */}
          {book && !story && isLoadingStory && (
            <div className="mt-16 flex flex-col items-center justify-center gap-4 py-12">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Opening your place…</p>
            </div>
          )}

          {/* Story content */}
          {book && story && (
            <article className="mt-10 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="font-semibold">{story.book.title}</span>
                <span>·</span>
                <span>Story {story.chapter.index + 1}</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold">{story.chapter.title}</h1>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>{story.chapter.word_count.toLocaleString()} words</span>
                <span>·</span>
                <span>about {story.chapter.minutes} min</span>
              </div>
              
              <div
                style={{ fontSize }}
                className="mt-8 space-y-5 leading-relaxed"
              >
                {story.chapter.text.split(/\n\n+/).map((p, i) => (
                  <p key={i} className="first-letter:float-left first-letter:me-2 first-letter:text-3xl first-letter:font-bold first-letter:leading-none first-letter:text-primary/80">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-12 flex items-center justify-between border-t pt-6">
                <ChapterNavButton
                  onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
                  disabled={chapterIndex === 0}
                  direction="prev"
                >
                  ← Previous
                </ChapterNavButton>
                
                <a
                  href={`/api/public/read/pdf?book=${story.book.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                  Open the full PDF
                </a>
                
                <ChapterNavButton
                  onClick={() => setChapterIndex((i) => Math.min(book.chapters.length - 1, i + 1))}
                  disabled={chapterIndex >= book.chapters.length - 1}
                  direction="next"
                >
                  Next →
                </ChapterNavButton>
              </div>
            </article>
          )}
        </main>
      )}
    </div>
  );
}

// Enhanced Reader Gate component
function ReaderGate({
  me,
  onSignedIn,
  onError,
}: {
  me: Awaited<ReturnType<typeof getMe>> | null;
  onSignedIn: () => void;
  onError?: (error: unknown) => void;
}) {
  const requestFn = useServerFn(requestCode);
  const verifyFn = useServerFn(verifyCode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const requestCodeNow = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await requestFn({ data: { email } });
      setMessage(result.message);
      
      // Check if we're in development mode with a dev code
      if (result.dev_code) {
        setDevCode(result.dev_code);
        setStep("code");
        toast(`Development code: ${result.dev_code}`);
      } else {
        setStep("code");
      }
      
      onSignedIn();
    } catch (e) {
      onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyNow = async () => {
    setIsLoading(true);
    
    try {
      await verifyFn({ data: { email, code } });
      onSignedIn();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCode(value.slice(0, 6));
  };

  const isEmailValid = email.includes("@") && email.includes(".");
  const isCodeValid = code.length === 6;

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-24 pt-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Reader access</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The room is invite-only. Enter your email and we'll send a six-digit sign-in code if you're on the list.
        </p>
      </div>

      <div className="mt-8 space-y-4 rounded-xl border bg-card p-6">
        {/* Email step */}
        {step === "email" && (
          <>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
            />
            
            <button
              disabled={isLoading || !isEmailValid}
              onClick={requestCodeNow}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90"
            >
              {isLoading ? <ButtonSpinner /> : "Send my code"}
            </button>
            
            {message && (
              <p className="text-sm text-center text-muted-foreground">{message}</p>
            )}
          </>
        )}

        {/* Code step */}
        {step === "code" && (
          <>
            <label htmlFor="email-verify" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email-verify"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm opacity-70"
            />
            
            <label htmlFor="code" className="block text-sm font-medium mt-4">
              Six-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              placeholder="123456"
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-center text-lg tracking-[0.4em] outline-none transition-all focus:ring-2 focus:ring-ring"
            />

            {/* Show dev code if available */}
            {devCode && (
              <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-center text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                Development code: <span className="font-mono font-bold">{devCode}</span>
              </div>
            )}

            <button
              disabled={isLoading || !isCodeValid}
              onClick={verifyNow}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90"
            >
              {isLoading ? <ButtonSpinner /> : "Sign in"}
            </button>

            <button
              onClick={() => {
                setStep("email");
                setCode("");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Didn't receive a code? Request again
            </button>
          </>
        )}
      </div>

      {/* Welcome message for authenticated users who got here */}
      {me?.authenticated && step === "email" && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already signed in as {me.email}
        </div>
      )}
    </main>
  );
}

// Book card skeleton for loading
function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card animate-pulse">
      <div className="aspect-[3/4] w-full bg-muted" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-1/4 rounded bg-muted" />
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="pt-4">
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// Utility function for formatting reading time
