import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Storyhouse" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
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
import type { BulkInviteResult, BulkInviteStatus } from "@/lib/bulk-invitations";
import { SiteHeader } from "@/components/site-chrome";
import { toast, ToastHost } from "@/components/toast";

type Summary = Awaited<ReturnType<typeof adminSummary>>;
type Readers = Awaited<ReturnType<typeof adminReaders>>["readers"];

function AdminPage() {
  const getMeFn = useServerFn(getMe);
  const [view, setView] = useState<"checking" | "login" | "dashboard">("checking");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [readers, setReaders] = useState<Readers>([]);
  const [filter, setFilter] = useState("");

  const refresh = async () => {
    const [s, r] = await Promise.all([adminSummary(), adminReaders()]);
    setSummary(s);
    setReaders(r.readers);
  };

  useEffect(() => {
    getMeFn()
      .then((me) => {
        if (me.authenticated && me.role === "admin") {
          setView("dashboard");
          refresh().catch((e) => toast(e instanceof Error ? e.message : "Could not load the dashboard."));
        } else {
          setView("login");
        }
      })
      .catch(() => setView("login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view === "checking") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <p className="p-16 text-center text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <SiteHeader active="admin" />
        <AdminLogin onSignedIn={() => setView("dashboard")} />
      </div>
    );
  }

  const shown = readers.filter((r) => (r.email + r.display_name).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader
        active="admin"
        right={
          <button
            onClick={() =>
              logout()
                .then(() => setView("login"))
                .catch(() => undefined)
            }
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Sign out
          </button>
        }
      />
      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10">
        <h1 className="text-3xl font-semibold">Reading room dashboard</h1>
        {summary && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Readers whitelisted" value={summary.total_readers} />
            <Stat label="Currently active" value={summary.active_readers} />
            <Stat label="Stories in the collection" value={summary.story_count} />
          </div>
        )}

        <BulkInviteForm
          onAdded={() =>
            refresh().catch((e) => toast(e instanceof Error ? e.message : "Could not refresh readers."))
          }
        />

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reader list</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter readers…"
            className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border bg-card">
          {shown.map((r) => (
            <div key={r.email} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.display_name || r.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.email}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <span className={"rounded-full px-3 py-1 text-xs " + (r.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {r.active ? "Active" : "Revoked"}
              </span>
              <button
                className="rounded-md border px-3 py-1 text-xs"
                onClick={() =>
                  adminUpdateReader({ data: { email: r.email, active: !r.active } })
                    .then(() => refresh())
                    .catch((e) => toast(e instanceof Error ? e.message : "Update failed."))
                }
              >
                {r.active ? "Revoke" : "Reactivate"}
              </button>
              <button
                className="rounded-md border px-3 py-1 text-xs text-destructive"
                onClick={() => {
                  if (!window.confirm(`Remove ${r.email} from the reading room?`)) return;
                  adminDeleteReader({ data: { email: r.email } })
                    .then(() => refresh())
                    .catch((e) => toast(e instanceof Error ? e.message : "Removal failed."));
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No readers match.</p>}
        </div>

        {summary && summary.recent_activity.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">Recent activity</h2>
            <ul className="mt-4 divide-y rounded-xl border bg-card">
              {summary.recent_activity.map((a) => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()} — </span>
                  <span className="font-medium">{a.action}</span>
                  {a.target_email ? <span className="text-muted-foreground"> · {a.target_email}</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const loginFn = useServerFn(adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await loginFn({ data: { email, password } });
      onSignedIn();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <h1 className="text-2xl font-semibold">Administrator sign-in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border bg-card p-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin email"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function BulkInviteForm({ onAdded }: { onAdded: () => void }) {
  const inviteFn = useServerFn(adminBulkAddReaders);
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState<BulkInviteResult[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const response = await inviteFn({ data: { emails } });
      setResults(response.results);
      const invited = response.results.filter((result) => result.status === "invited").length;
      const reactivated = response.results.filter((result) => result.status === "reactivated").length;
      toast(`${invited} invited · ${reactivated} reactivated · ${response.results.length - invited - reactivated} unchanged or skipped`);
      if (invited || reactivated) onAdded();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not invite those readers.");
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
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Invite readers</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[1fr_auto]">
        <textarea
          required
          value={emails}
          onChange={(e) => {
            setEmails(e.target.value);
            setResults([]);
          }}
          placeholder="Reader email addresses, separated by commas or new lines"
          aria-label="Reader email addresses"
          rows={4}
          className="min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Inviting…" : "Invite readers"}
        </button>
      </form>
      {results.length > 0 && (
        <ul aria-label="Invitation results" className="mt-3 divide-y rounded-lg border bg-card">
          {results.map((result) => (
            <li key={result.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="break-all">{result.email}</span>
              <span className={result.status === "invited" || result.status === "reactivated" ? "text-primary" : "text-muted-foreground"}>
                {labels[result.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

