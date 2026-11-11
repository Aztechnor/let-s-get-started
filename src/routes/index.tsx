import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getLibrary } from "@/lib/storyhouse.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ToastHost } from "@/components/toast";
import { Skeleton, Badge, ProgressBar } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Storyhouse — a reading room for stories that stay" },
      {
        name: "description",
        content: "A private digital reading room for Under Blue Skies and SPOOK by Blex Wakabi.",
      },
      { property: "og:title", content: "Storyhouse — a reading room for stories that stay" },
      {
        property: "og:description",
        content: "A private digital reading room for Under Blue Skies and SPOOK by Blex Wakabi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      queryOptions({ queryKey: ["library"], queryFn: () => getLibrary() }),
    ),
  component: HomePage,
});

const libraryOptions = queryOptions({ queryKey: ["library"], queryFn: () => getLibrary() });

// Book card with enhanced UI
function BookCard({
  book,
  className,
}: {
  book: Awaited<ReturnType<typeof getLibrary>>["books"][number];
  className?: string;
}) {
  return (
    <Link
      to="/read"
      search={{ book: book.id, chapter: 0 }}
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      {/* Book cover */}
      {book.cover ? (
        <img
          src={book.cover}
          alt={`${book.title} cover`}
          className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="aspect-[3/4] w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <span className="text-6xl text-muted-foreground/50">📖</span>
        </div>
      )}

      {/* Book details */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {book.kind}
          </Badge>
        </div>
        
        <h3 className="mt-3 text-xl font-semibold group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{book.subtitle}</p>
        
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground leading-relaxed">
          {book.description}
        </p>
        
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {book.story_count} stories · by {book.author}
          </span>
          <span className="text-primary font-medium">
            Read now →
          </span>
        </div>
      </div>
    </Link>
  );
}

// Book card skeleton for loading
function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card animate-pulse">
      <div className="aspect-[3/4] w-full bg-muted" />
      <div className="p-6 space-y-4">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-6 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="mt-4 h-4 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

// Feature card
function Feature({ title, body, icon }: { title: string; body: string; icon?: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 transition-all hover:shadow-md">
      {icon && (
        <span className="text-2xl text-primary" aria-hidden>
          {icon}
        </span>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

// Hero section
function HeroSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span>Private reading room</span>
      </div>
      
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        The digital reading room
      </p>
      
      <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
        Stories that stay with you, kept on a quiet shelf.
      </h1>
      
      <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Storyhouse is a private home for two collections — Under Blue Skies and SPOOK — read slowly,
        shared by invite, and never lost to the feed.
      </p>
      
      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/read"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
        >
          Enter the room
        </Link>
        <a
          href="#library"
          className="rounded-lg border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          See the collection
        </a>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          <span className="text-primary">✓</span>
          <span>Invite-only</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          <span className="text-primary">📖</span>
          <span>2 Books</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          <span className="text-primary">🔒</span>
          <span>Secure</span>
        </div>
      </div>
    </section>
  );
}

// Library section
function LibrarySection({ books }: { books: Awaited<ReturnType<typeof getLibrary>>["books"] }) {
  return (
    <section id="library" className="mx-auto max-w-5xl scroll-mt-24 px-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">The collection</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {books.length} books available to read
          </p>
        </div>
        <Link
          to="/read"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

// Features section
function FeaturesSection() {
  return (
    <section className="border-y bg-card">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
        <Feature
          title="Invite-only access"
          body="Readers join with a one-time email code — no feeds, no noise, no strangers."
          icon="🔐"
        />
        <Feature
          title="Read your way"
          body="Adjust the type size, search every story, and pick up where you left off."
          icon="📖"
        />
        <Feature
          title="Quote studio"
          body="Lift the lines that stay with you into cards worth keeping or sharing."
          icon="✨"
        />
      </div>
    </section>
  );
}

// CTA section
function CtaSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-lg italic leading-relaxed">
        «A good story doesn’t end — it waits for you to come back.»
      </p>
      <Link
        to="/read"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
      >
        Enter the room
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function HomePage() {
  const { data, isPending } = useSuspenseQuery(libraryOptions);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader active="library" />

      <main>
        <HeroSection />

        {isPending ? (
          <LibrarySection books={[]} />
        ) : (
          <>
            <LibrarySection books={data.books} />
            <FeaturesSection />
            <CtaSection />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default HomePage;
