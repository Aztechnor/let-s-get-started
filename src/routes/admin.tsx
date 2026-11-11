import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  adminBulkAddReaders,
  adminDeleteReader,
  adminLogin,
  adminReaders,
  adminSummary,
  adminUpdateReader,
  getMe,
  logout,
} from "@/lib/storyhouse.functions";
import type {
  AuditEntry,
  ReaderProgressInfo,
  ReaderRow,
} from "@/lib/storyhouse.functions";
import type { BulkInviteResult, BulkInviteStatus } from "@/lib/bulk-invitations";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Storyhouse" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Summary = Awaited<ReturnType<typeof adminSummary>>;
type ReaderFilter = "all" | "active" | "revoked" | "reading";
type DashboardTab = "readers" | "activity";

function AdminPage() {
  const getMeFn = useServerFn(getMe);
  const [view, setView] = useState<"checking" | "login" | "dashboard">("checking");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [readers, setReaders] = useState<ReaderRow[]>([]);
  const [progress, setProgress] = useState<Record<string, ReaderProgressInfo>>({});
  const [filter, setFilter] = useState("");
  const [readerFilter, setReaderFilter] = useState<ReaderFilter>("all");
  const [tab, setTab] = useState<DashboardTab>("readers");
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextReaders] = await Promise.all([adminSummary(), adminReaders()]);
      setSummary(nextSummary);
      setReaders(nextReaders.readers);
      setProgress(nextReaders.progress);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMeFn()
      .then((me) => {
        if (me.authenticated && me.role === "admin") {
          setView("dashboard");
          refresh().catch((error) =>
            toast(error instanceof Error ? error.message : "Could not load the dashboard."),
          );
        } else {
          setView("login");
        }
      })
      .catch(() => setView("login"));
    // Initial session check only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeReaders = useMemo(() => readers.filter((reader) => reader.active), [readers]);
  const readingNow = useMemo(
    () => activeReaders.filter((reader) => Boolean(progress[reader.email])),
    [activeReaders, progress],
  );
  const shownReaders = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return readers.filter((reader) => {
      const matchesQuery =
        !query ||
        [reader.email, reader.display_name, reader.note].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesFilter =
        readerFilter === "all" ||
        (readerFilter === "active" && reader.active) ||
        (readerFilter === "revoked" && !reader.active) ||
        (readerFilter === "reading" && reader.active && Boolean(progress[reader.email]));
      return matchesQuery && matchesFilter;
    });
  }, [filter, readerFilter, readers, progress]);

  if (view === "checking") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Checking administrator access…</p>
        </div>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <SiteHeader active="admin" />
        <AdminLogin onSignedIn={() => {
          setView("dashboard");
          refresh().catch((error) =>
            toast(error instanceof Error ? error.message : "Could not load the dashboard."),
          );
        }} />
      </div>
    );
  }

  const signOut = async () => {
    try {
      await logout();
      setView("login");
      setSummary(null);
      setReaders([]);
      setProgress({});
    } catch {
      toast("Could not sign out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#24251f]">
      <ToastHost />
      <SiteHeader
        active="admin"
        right={
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-[#dedbd3] bg-white px-4 py-2 text-sm font-medium text-[#55564f] transition hover:border-[#b8b4a8] hover:text-[#24251f]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        }
      />
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-[#e2dfd6] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#898578]">
              Storyhouse / Administration
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#24251f] sm:text-5xl">
              Reading room
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#77776f]">
              Manage invitations, reader access and the quiet progress of every story.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-[#55564f]">Last updated</p>
              <p className="mt-1 text-xs text-[#898578]">
                {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh().catch((error) =>
                toast(error instanceof Error ? error.message : "Could not refresh the dashboard."),
              )}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8d4ca] bg-white px-4 py-2.5 text-sm font-medium text-[#45463f] transition hover:bg-[#eeece5] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <section aria-label="Reading room statistics" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users className="h-4 w-4" />} label="Readers invited" value={summary?.total_readers ?? readers.length} detail="Across the reading room" />
          <MetricCard icon={<UserCheck className="h-4 w-4" />} label="Active access" value={summary?.active_readers ?? activeReaders.length} detail="Currently allowed to sign in" />
          <MetricCard icon={<BookOpen className="h-4 w-4" />} label="Currently reading" value={readingNow.length} detail="Readers with saved progress" />
          <MetricCard icon={<Activity className="h-4 w-4" />} label="Stories available" value={summary?.story_count ?? 0} detail={`${summary?.book_count ?? 0} books in the collection`} />
        </section>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-b border-[#e2dfd6]">
          <div className="flex items-center gap-6">
            <TabButton active={tab === "readers"} onClick={() => setTab("readers")}>
              <Users className="h-4 w-4" />
              Readers
              <span className="rounded-full bg-[#ece9e1] px-2 py-0.5 text-[10px] tabular-nums">{readers.length}</span>
            </TabButton>
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
              <Activity className="h-4 w-4" />
              Activity
              <span className="rounded-full bg-[#ece9e1] px-2 py-0.5 text-[10px] tabular-nums">{summary?.recent_activity.length ?? 0}</span>
            </TabButton>
          </div>
          <BulkInviteForm onAdded={() => refresh().catch((error) =>
            toast(error instanceof Error ? error.message : "Could not refresh readers."),
          )} />
        </div>

        {tab === "readers" ? (
          <section className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-serif text-2xl text-[#292a24]">Reader directory</h2>
                <p className="mt-1 text-sm text-[#858278]">
                  {shownReaders.length} of {readers.length} reader{readers.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99958a]" />
                  <input
                    aria-label="Search readers"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Search name, email or note"
                    className="w-full rounded-full border border-[#ddd9d0] bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-[#aaa69b] focus:border-[#8f9b81] focus:ring-2 focus:ring-[#8f9b81]/15"
                  />
                </div>
                <div className="inline-flex items-center gap-1 self-start rounded-full border border-[#ddd9d0] bg-white p-1">
                  {([
                    ["all", "All"],
                    ["active", "Active"],
                    ["revoked", "Revoked"],
                    ["reading", "Reading"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReaderFilter(value)}
                      aria-pressed={readerFilter === value}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${readerFilter === value ? "bg-[#292d25] text-white" : "text-[#77776f] hover:bg-[#f1efe9]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#e2dfd6] bg-white shadow-[0_8px_30px_rgba(43,43,35,0.035)]">
              <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_120px_130px] gap-4 border-b border-[#eeeae2] bg-[#faf9f6] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99958a] md:grid">
                <span>Reader</span>
                <span>Reading progress</span>
                <span>Last sign-in</span>
                <span className="text-right">Access</span>
              </div>
              {shownReaders.map((reader) => (
                <ReaderCard
                  key={reader.email}
                  reader={reader}
                  progress={progress[reader.email]}
                  onRefresh={refresh}
                />
              ))}
              {shownReaders.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f0e9] text-[#9a968a]">
                    <Filter className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[#45463f]">No readers found</p>
                  <p className="mt-1 text-xs text-[#918d82]">Try another search or change the access filter.</p>
                  <button
                    type="button"
                    onClick={() => { setFilter(""); setReaderFilter("all"); }}
                    className="mt-4 text-xs font-semibold text-[#64745c] underline underline-offset-4"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <ActivityPanel entries={summary?.recent_activity ?? []} />
        )}
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2dfd6] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#858278]">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f0e9] text-[#707d65]">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-serif text-4xl tabular-nums text-[#292a24]">{value.toLocaleString()}</p>
      <p className="mt-1 text-[11px] text-[#99958a]">{detail}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition ${active ? "border-[#66765e] text-[#34382e]" : "border-transparent text-[#8a867c] hover:text-[#4e5048]"}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

function ReaderCard({
  reader,
  progress,
  onRefresh,
}: {
  reader: ReaderRow;
  progress?: ReaderProgressInfo | undefined;
  onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = (reader.display_name || reader.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const toggleAccess = async () => {
    setBusy(true);
    try {
      await adminUpdateReader({ data: { email: reader.email, active: !reader.active } });
      toast(reader.active ? "Reader access revoked." : "Reader access restored.");
      await onRefresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update reader access.");
    } finally {
      setBusy(false);
    }
  };

  const removeReader = async () => {
    if (!window.confirm(`Permanently remove ${reader.email} from the reading room? Their saved reading progress will also be removed.`)) return;
    setBusy(true);
    try {
      await adminDeleteReader({ data: { email: reader.email } });
      toast("Reader removed from the reading room.");
      await onRefresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove reader.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-[#efede7] last:border-b-0">
      <div className="grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_120px_130px] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9ece4] font-serif text-sm text-[#617057]">
            {initials || "R"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#373831]">{reader.display_name || "Unnamed reader"}</p>
            <p className="truncate text-xs text-[#918d82]">{reader.email}</p>
            {reader.note && <p className="mt-1 truncate text-[11px] text-[#9d998e]">{reader.note}</p>}
          </div>
        </div>
        <div className="min-w-0">
          {progress ? (
            <>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-[#5c6254]">{progress.book_title}</span>
                <span className="shrink-0 tabular-nums text-[#8c897f]">{progress.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eeece5]">
                <div className="h-full rounded-full bg-[#829076] transition-all" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-[#9b978d]">Chapter {progress.chapter_index + 1} of {progress.chapter_count}</p>
            </>
          ) : (
            <span className="text-xs text-[#aaa69c]">No saved progress yet</span>
          )}
        </div>
        <div className="text-xs text-[#77776f]">
          {reader.last_login_at ? (
            <>
              <p>{new Date(reader.last_login_at).toLocaleDateString()}</p>
              <p className="mt-0.5 text-[10px] text-[#a09c91]">{new Date(reader.last_login_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </>
          ) : <span className="text-[#aaa69c]">Never signed in</span>}
        </div>
        <div className="flex items-center justify-between gap-2 md:justify-end">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${reader.active ? "bg-[#edf2e9] text-[#607455]" : "bg-[#f1efeb] text-[#8f8a80]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${reader.active ? "bg-[#7d956d]" : "bg-[#aaa59a]"}`} />
            {reader.active ? "Active" : "Revoked"}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={`Manage ${reader.email}`}
            className="rounded-full border border-[#e2dfd6] p-2 text-[#77776f] transition hover:bg-[#f5f3ee]"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#efede7] bg-[#fbfaf7] px-4 py-5 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_auto]">
            <ReaderEditor reader={reader} onSaved={onRefresh} />
            <div className="rounded-xl border border-[#e8e5dc] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99958a]">Reader record</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-[#99958a]">Added</dt><dd className="text-right text-[#55564f]">{new Date(reader.added_at).toLocaleDateString()}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#99958a]">Invited by</dt><dd className="max-w-[65%] truncate text-right text-[#55564f]">{reader.added_by || "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#99958a]">Latest progress</dt><dd className="text-right text-[#55564f]">{progress ? new Date(progress.updated_at).toLocaleDateString() : "None"}</dd></div>
              </dl>
              {progress && (
                <div className="mt-4 rounded-lg bg-[#f5f4ef] p-3">
                  <p className="text-xs font-medium text-[#55564f]">{progress.book_title}</p>
                  <p className="mt-1 text-[11px] text-[#8d897f]">Furthest reached: chapter {progress.furthest_index + 1} of {progress.chapter_count}</p>
                </div>
              )}
            </div>
            <div className="flex flex-row gap-2 lg:flex-col">
              <button type="button" disabled={busy} onClick={toggleAccess} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dcd8ce] bg-white px-3 py-2 text-xs font-medium text-[#55564f] transition hover:bg-[#f2f0e9] disabled:opacity-50">
                <ShieldCheck className="h-3.5 w-3.5" />
                {reader.active ? "Revoke access" : "Restore access"}
              </button>
              <button type="button" disabled={busy} onClick={removeReader} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#ead5ce] bg-white px-3 py-2 text-xs font-medium text-[#a05e4c] transition hover:bg-[#fff7f3] disabled:opacity-50">
                <X className="h-3.5 w-3.5" />
                Remove reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReaderEditor({ reader, onSaved }: { reader: ReaderRow; onSaved: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState(reader.display_name);
  const [note, setNote] = useState(reader.note);
  const [busy, setBusy] = useState(false);
  const changed = displayName !== reader.display_name || note !== reader.note;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await adminUpdateReader({ data: { email: reader.email, display_name: displayName, note } });
      await onSaved();
      toast("Reader profile saved.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save reader details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99958a]">Profile details</p>
      <label className="block">
        <span className="mb-1.5 block text-xs text-[#77776f]">Display name</span>
        <input value={displayName} maxLength={100} onChange={(event) => setDisplayName(event.target.value)} placeholder="Reader name" className="w-full rounded-lg border border-[#e0dcd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#87947b]" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-[#77776f]">Private admin note</span>
        <textarea value={note} maxLength={250} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for administrators" className="w-full resize-y rounded-lg border border-[#e0dcd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#87947b]" />
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-[#aaa69c]">{note.length}/250 characters</span>
        <button type="submit" disabled={!changed || busy} className="inline-flex items-center gap-2 rounded-lg bg-[#394333] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#4b5944] disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save details
        </button>
      </div>
    </form>
  );
}

function ActivityPanel({ entries }: { entries: AuditEntry[] }) {
  return (
    <section className="pt-7">
      <div>
        <h2 className="font-serif text-2xl text-[#292a24]">Recent activity</h2>
        <p className="mt-1 text-sm text-[#858278]">A record of access and reader-management events.</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e2dfd6] bg-white">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2 border-b border-[#efede7] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f0e9] text-[#77816d]">
                <Activity className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#45463f]">{entry.action.replaceAll("_", " ")}</p>
                <p className="mt-1 truncate text-xs text-[#8e8a80]">
                  {entry.target_email || entry.actor_email}
                  {entry.detail ? ` · ${entry.detail}` : ""}
                </p>
              </div>
            </div>
            <div className="shrink-0 pl-11 text-[11px] text-[#99958a] sm:pl-0 sm:text-right">
              <p>{new Date(entry.created_at).toLocaleDateString()}</p>
              <p className="mt-0.5">{new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-[#aaa69c]" />
            <p className="mt-3 text-sm font-medium text-[#55564f]">No activity recorded yet</p>
            <p className="mt-1 text-xs text-[#99958a]">Reader-management events will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const loginFn = useServerFn(adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await loginFn({ data: { email, password } });
      onSignedIn();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-24 pt-16">
      <div className="rounded-3xl border border-[#e2dfd6] bg-[#fbfaf7] p-7 shadow-[0_14px_50px_rgba(43,43,35,0.06)] sm:p-9">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9ece4] text-[#64745c]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e8a80]">Private access</p>
        <h1 className="mt-2 font-serif text-3xl text-[#292a24]">Administrator sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-[#858278]">Sign in to manage the Storyhouse reading room.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#68695f]">Email address</span>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Admin email"
              className="w-full rounded-xl border border-[#dedad0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#89967e] focus:ring-2 focus:ring-[#89967e]/15"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[#68695f]">Password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Administrator password"
              className="w-full rounded-xl border border-[#dedad0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#89967e] focus:ring-2 focus:ring-[#89967e]/15"
            />
          </label>
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#394333] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#4b5944] disabled:opacity-50">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? "Checking access…" : "Enter administration"}
          </button>
        </form>
      </div>
    </main>
  );
}

function BulkInviteForm({ onAdded }: { onAdded: () => void }) {
  const inviteFn = useServerFn(adminBulkAddReaders);
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState<BulkInviteResult[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await inviteFn({ data: { emails } });
      setResults(response.results);
      const invited = response.results.filter((result) => result.status === "invited").length;
      const reactivated = response.results.filter((result) => result.status === "reactivated").length;
      const failed = response.results.filter((result) => result.status === "failed").length;
      toast(`${invited} invited · ${reactivated} restored · ${failed} failed`);
      if (invited || reactivated) await onAdded();
      if (invited || reactivated) setEmails("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not invite those readers.");
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<BulkInviteStatus, string> = {
    invited: "Invited",
    reactivated: "Reactivated",
    already_active: "Already active",
    invalid: "Invalid email",
    admin_account: "Administrator account",
    failed: "Could not invite",
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full bg-[#394333] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#4b5944]">
        <Mail className="h-4 w-4" />
        Invite readers
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-3 w-[min(92vw,440px)] rounded-2xl border border-[#e2dfd6] bg-white p-5 shadow-[0_18px_50px_rgba(43,43,35,0.14)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl text-[#292a24]">Invite readers</h3>
              <p className="mt-1 text-xs leading-5 text-[#8b877d]">Add up to 100 email addresses. Existing revoked readers will be restored.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close invitation panel" className="rounded-full p-1.5 text-[#99958a] hover:bg-[#f3f1eb]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <textarea
              required
              value={emails}
              onChange={(event) => { setEmails(event.target.value); setResults([]); }}
              placeholder="reader@example.com&#10;another@example.com"
              aria-label="Reader email addresses"
              rows={5}
              className="w-full resize-y rounded-xl border border-[#dedad0] bg-[#fdfcf9] px-3 py-3 text-sm outline-none focus:border-[#89967e]"
            />
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#394333] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#4b5944] disabled:opacity-50">
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {busy ? "Processing invitations…" : "Process invitations"}
            </button>
          </form>
          {results.length > 0 && (
            <ul aria-label="Invitation results" className="mt-4 max-h-52 divide-y divide-[#efede7] overflow-y-auto rounded-xl border border-[#ece9e1]">
              {results.map((result) => (
                <li key={result.email} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                  <span className="min-w-0 break-all text-[#5f6058]">{result.email}</span>
                  <span className={`shrink-0 ${result.status === "invited" || result.status === "reactivated" ? "font-semibold text-[#64745c]" : "text-[#99958a]"}`}>
                    {labels[result.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
