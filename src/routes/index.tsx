import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getLibrary } from "@/lib/storyhouse.functions";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ToastHost } from "@/components/toast";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Library of Alexandria — Early access to stories that stay" },
      {
        name: "description",
        content:
          "An invitation-only digital reading room for Under Blue Skies and SPOOK by Blex Wakabi.",
      },
      { property: "og:title", content: "The Library of Alexandria — Early access to stories that stay" },
      {
        property: "og:description",
        content:
          "Two books. One private reading room. Discover Under Blue Skies and SPOOK by Blex Wakabi.",
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
    <div className="min-h-screen bg-[#f5f1e8] text-[#242924]">
      <ToastHost />
      <SiteHeader active="library" />

      <main>
        <section className="relative isolate overflow-hidden bg-[#171d20] text-[#f4eee2]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-36 -top-44 h-[36rem] w-[36rem] rounded-full bg-[#557d91]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-56 left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#8d7553]/20 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-16 sm:px-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:pb-28 lg:pt-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7c9ac]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b9d5d8]" />
                Early access · Private reading room
              </div>

              <p className="mt-8 text-[11px] uppercase tracking-[0.3em] text-[#aeb8b4]">
                The Library of Alexandria
              </p>
              <h1 className="mt-4 max-w-[13ch] font-serif text-5xl font-normal leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.7rem]">
                Two books.
                <span className="block text-[#c8d9d6]">Worlds to get lost in.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#c4c8c1] sm:text-lg">
                A home for stories best read without hurry. Get early access to
                Under Blue Skies and SPOOK, settle into a chapter, and return
                exactly where the story left you.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#collection"
                  className="inline-flex items-center justify-center rounded-full bg-[#e9dfca] px-6 py-3 text-sm font-semibold text-[#252b28] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Explore the books <span className="ml-3" aria-hidden="true">↓</span>
                </a>
                <Link
                  to="/read"
                  search={{ book: undefined, chapter: 0 }}
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-[#f4eee2] transition hover:border-white/60 hover:bg-white/10"
                >
                  Enter the reading room <span className="ml-3" aria-hidden="true">↗</span>
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.16em] text-[#aeb8b4]">
                <span>Invitation-only access</span>
                <span>Made for reading</span>
                <span>By Blex Wakabi</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-[3rem] bg-[#b6c9c5]/10 blur-3xl"
              />
              <div className="relative grid grid-cols-2 items-center gap-0 [perspective:1400px]">
                <div className="relative z-10 -rotate-[5deg] overflow-hidden rounded-l-[1.2rem] border border-[#d7c8a7]/30 bg-[#e8ddc8] p-3 shadow-[0_28px_65px_rgba(0,0,0,0.38)] sm:p-4">
                  <div className="flex h-[250px] flex-col justify-between bg-[#eee5d3] p-4 text-[#514638] sm:h-[340px] sm:p-6">
                    <p className="text-[8px] uppercase tracking-[0.2em] text-[#8a785f] sm:text-[9px]">
                      A place between pages
                    </p>
                    <div>
                      <div className="mb-4 text-3xl text-[#8b9b8b] sm:text-5xl" aria-hidden="true">✳</div>
                      <p className="font-serif text-2xl leading-tight sm:text-4xl">
                        Leave the noise outside.
                      </p>
                      <p className="mt-4 max-w-[18ch] text-[10px] leading-5 text-[#887a68] sm:text-xs">
                        Find a story. Take your time. Make the pages yours.
                      </p>
                    </div>
                    <p className="text-[8px] uppercase tracking-[0.16em] text-[#9a8a72]">
                      The Library of Alexandria
                    </p>
                  </div>
                </div>
                <div className="relative z-20 -ml-6 rotate-[4deg] overflow-hidden rounded-r-[1.2rem] border border-white/15 bg-[#202927] shadow-[0_32px_75px_rgba(0,0,0,0.52)] sm:-ml-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#77969b]/30 via-transparent to-[#b29a73]/20" />
                  <div className="relative flex h-[276px] flex-col items-center justify-center px-4 py-5 text-center sm:h-[372px] sm:px-7">
                    <div className="mb-5 text-3xl text-[#d5c6a6] sm:text-4xl" aria-hidden="true">✧</div>
                    <p className="font-serif text-3xl leading-[1.08] tracking-tight text-[#f2ebdc] sm:text-5xl">
                      The next chapter
                      <span className="block italic text-[#bdcfca]">is yours.</span>
                    </p>
                    <div className="mt-7 h-px w-16 bg-[#bda985]/70" />
                    <p className="mt-5 text-[8px] uppercase tracking-[0.2em] text-[#b9b9ad] sm:text-[9px]">
                      Two stories · One reading room
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-1 top-[10%] z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#a7c1c4]/40 bg-[#263b40]/90 text-2xl text-[#c7e0df] shadow-xl sm:-right-4 sm:h-16 sm:w-16 sm:text-3xl">
                <span className="animate-pulse" aria-hidden="true">✧</span>
              </div>
              <p className="mt-8 text-center text-[9px] uppercase tracking-[0.24em] text-[#aab4af]">
                Turn the page. Stay a while.
              </p>
            </div>
          </div>
        </section>

        <section id="collection" className="scroll-mt-20 bg-[#f5f1e8] px-6 py-20 sm:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b806f]">
                  The collection · 01—02
                </p>
                <h2 className="mt-3 font-serif text-4xl font-normal tracking-tight text-[#28302c] sm:text-5xl">
                  Choose your world.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#77796f]">
                  Two very different journeys, held in one quiet place. Browse
                  the books, then sign in with your invited email to read.
                </p>
              </div>
              <Link
                to="/cards"
                className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#526a61] transition hover:text-[#28302c]"
              >
                Share the collection <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {data.books.map((book, index) => {
                const isSpook = book.title.toLowerCase().includes("spook");
                const panel = isSpook
                  ? "linear-gradient(135deg, #282a27 0%, #454237 54%, #78634b 100%)"
                  : "linear-gradient(135deg, #243c4c 0%, #3a6373 54%, #809b9b 100%)";
                return (
                  <article
                    key={book.id}
                    className="group relative isolate overflow-hidden rounded-[2rem] border border-black/5 p-5 shadow-[0_14px_42px_rgba(51,45,34,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(51,45,34,0.14)] sm:p-7"
                    style={{ background: panel }}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl"
                    />
                    <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(145px,0.72fr)_1.28fr] sm:gap-8">
                      <div className="mx-auto w-full max-w-[220px] sm:max-w-none">
                        <div className="overflow-hidden rounded-md border border-white/15 bg-black/10 shadow-[0_22px_35px_rgba(0,0,0,0.34)] transition duration-500 group-hover:rotate-[-1deg] group-hover:scale-[1.02]">
                          {book.cover ? (
                            <img
                              src={book.cover}
                              alt={`Cover of ${book.title}`}
                              className="aspect-[3/4] w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center font-serif text-2xl text-white">
                              {book.title}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-[#f2eee3]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.17em]">
                            Early access
                          </span>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-white/65">
                            {book.kind}
                          </span>
                        </div>
                        <h3 className="mt-5 font-serif text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
                          {book.title}
                        </h3>
                        <p className="mt-2 text-sm text-white/75">{book.subtitle}</p>
                        <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/80">
                          {book.description}
                        </p>
                        <p className="mt-5 text-[10px] uppercase tracking-[0.14em] text-white/60">
                          {book.story_count} stories · {book.author}
                        </p>
                        <div className="mt-7 flex flex-wrap gap-2">
                          <Link
                            to="/read"
                            search={{ book: book.id, chapter: 0 }}
                            className="inline-flex items-center justify-center rounded-full bg-[#f0e6d3] px-5 py-2.5 text-xs font-semibold text-[#2b3430] transition hover:bg-white"
                          >
                            Read with access <span className="ml-2" aria-hidden="true">↗</span>
                          </Link>
                          <Link
                            to="/cards"
                            className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
                          >
                            Share this book
                          </Link>
                        </div>
                      </div>
                    </div>
                    <span className="pointer-events-none absolute right-7 top-6 font-serif text-4xl text-white/15">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-[#e2dacc] bg-[#ece5d8] px-6 py-16 sm:px-10">
          <div className="mx-auto grid max-w-7xl gap-9 md:grid-cols-3">
            <Feature
              number="01"
              title="A private invitation"
              body="Reader access is managed by invitation. Sign in with your approved email and a one-time code."
            />
            <Feature
              number="02"
              title="A room built for reading"
              body="Set your page tone and type, search the collection, bookmark chapters and return to your place."
            />
            <Feature
              number="03"
              title="Stories worth passing on"
              body="Share a book card with friends and invite them to discover the collection."
            />
          </div>
        </section>

        <section className="bg-[#f5f1e8] px-6 py-20 text-center sm:px-10 lg:py-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#8b806f]">
            Your invitation is waiting
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-4xl font-normal leading-tight tracking-tight text-[#28302c] sm:text-5xl">
            Come in. Find a story. Stay for a chapter.
          </h2>
          <Link
            to="/read"
            search={{ book: undefined, chapter: 0 }}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#2d4039] px-7 py-3.5 text-sm font-semibold text-[#f7f1e5] transition hover:-translate-y-0.5 hover:bg-[#405c50]"
          >
            Enter the reading room <span className="ml-3" aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-[#cfc5b4] pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#887d6c]">{number}</p>
      <h3 className="mt-4 font-serif text-2xl font-normal text-[#29322d]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-[#77796f]">{body}</p>
    </div>
  );
}
