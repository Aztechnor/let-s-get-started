import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getLibrary } from "@/lib/storyhouse.functions";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToastHost } from "@/components/toast";

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

function HomePage() {
  const { data } = useSuspenseQuery(libraryOptions);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader active="library" />

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The digital reading room</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Stories that stay with you, kept on a quiet shelf.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Storyhouse is a private home for two collections — Under Blue Skies and SPOOK — read slowly,
            shared by invite, and never lost to the feed.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/read" className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              Enter the room
            </Link>
            <a href="#library" className="rounded-lg border px-6 py-3 text-sm">
              See the collection
            </a>
          </div>
        </section>

        <section id="library" className="mx-auto max-w-5xl scroll-mt-24 px-6 pb-20">
          <h2 className="text-2xl font-semibold">The collection</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {data.books.map((book) => (
              <Link
                key={book.id}
                to="/read"
                search={{ book: book.id, chapter: 0 }}
                className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
              >
                {book.cover ? (
                  <img src={book.cover} alt={`${book.title} cover`} className="aspect-[3/4] w-full object-cover" />
                ) : null}
                <div className="p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{book.kind}</p>
                  <h3 className="mt-2 text-xl font-semibold">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.subtitle}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{book.description}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {book.story_count} stories · by {book.author}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
            <Feature title="Invite-only access" body="Readers join with a one-time email code — no feeds, no noise, no strangers." />
            <Feature title="Read your way" body="Adjust the type size, search every story, and pick up where you left off." />
            <Feature title="Quote studio" body="Lift the lines that stay with you into cards worth keeping or sharing." />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-lg italic leading-relaxed">“A good story doesn’t end — it waits for you to come back.”</p>
          <Link to="/read" className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
            Enter the room
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
