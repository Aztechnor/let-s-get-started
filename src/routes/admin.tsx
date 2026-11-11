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
import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { cn, truncate } from "@/lib/utils";
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
import type { BulkInviteResult } from "@/lib/bulk-invitations";
import { SiteHeader, UserIndicator } from "@/components/site-chrome";
import { toast, toastSuccess, toastError, ToastHost } from "@/components/toast";
import { Spinner, ButtonSpinner, EmptyState, Badge, ProgressBar } from "@/components/ui/loading";

type Summary = Awaited<ReturnType<typeof adminSummary>>;
type ReaderRow = Awaited<ReturnType<typeof adminReaders>>["readers"][number];

type ReaderWithProgress = ReaderRow & {
  progress?: Awaited<ReturnType<typeof adminReaders>>["progress"][string];
};

// Status badge for reader
function ReaderStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "default"} dot>
      {active ? "Active" : "Revoked"}
    </Badge>
  );
}

// Reader row in the table
function ReaderRowItem({
  reader,
  progress,
  onToggleActive,
  onDelete,
}: {
  reader: ReaderRow;
  progress?: Awaited<ReturnType<typeof adminReaders>>["progress"][string];
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${reader.email} from the reading room?`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      toastSuccess(`Removed ${reader.email}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to remove reader");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {reader.display_name.charAt(0).toUpperCase() || reader.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{reader.display_name || reader.email}</p>
            <p className="text-xs text-muted-foreground">{reader.email}</p>
            {reader.note && (
              <p className="text-xs text-muted-foreground italic">{truncate(reader.note, 40)}</p>
            )}
          </div>
        </div>
      </td>
      <td className="p-4">
        <ReaderStatusBadge active={reader.active} />
      </td>
      <td className="p-4">
        {reader.added_at ? new Date(reader.added_at).toLocaleDateString() : "—"}
      </td>
      <td className="p-4">
        {reader.last_login_at ? new Date(reader.last_login_at).toLocaleDateString() : "—"}
      </td>
      <td className="p-4">
        {progress ? (
          <div className="flex items-center gap-2">
            <span className="text-xs">{progress.book_title}</span>
            <ProgressBar value={progress.percent} max={100} className="w-20" />
            <span className="text-xs text-muted-foreground">{progress.percent}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not started</span>
        )}
      </td>
      <td className="p-4">
        <div className="flex gap-2">
          <button
            onClick={onToggleActive}
            className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
          >
            {reader.active ? "Revoke" : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? <ButtonSpinner className="h-3 w-3" /> : "Remove"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// Stat card component
function StatCard({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <p className="text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Bulk invite result item
function BulkInviteResultItem({ result }: { result: BulkInviteResult }) {
  const statusLabels: Record<string, { label: string; icon: string; color: string }> = {
    invited: { label: "Invited", icon: "✓", color: "text-green-600" },
    reactivated: { label: "Reactivated", icon: "✓", color: "text-green-600" },
    already_active: { label: "Already active", icon: "ℹ️", color: "text-blue-600" },
    invalid: { label: "Invalid email", icon: "✗", color: "text-red-600" },
    admin_account: { label: "Admin account", icon: "⚠", color: "text-yellow-600" },
    failed: { label: "Failed", icon: "✗", color: "text-red-600" },
  };

  const status = statusLabels[result.status] || { label: result.status, icon: "?", color: "" };

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
      <span className="break-all font-medium">{result.email}</span>
      <span className={cn("flex items-center gap-1", status.color)}>
        <span>{status.icon}</span>
        <span>{status.label}</span>
      </span>
    </li>
  );
}

// Admin login form
function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const loginFn = useServerFn(adminLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await loginFn({ data: { email, password } });
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 pb-24 pt-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Administrator sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access the reading room dashboard
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-card p-6">
        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium">
            Admin email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90"
        >
          {isLoading ? <ButtonSpinner /> : "Sign in"}
        </button>
      </form>
    </main>
  );
}

// Bulk invite form
function BulkInviteForm({ onAdded }: { onAdded: () => void }) {
  const inviteFn = useServerFn(adminBulkAddReaders);
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState<BulkInviteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await inviteFn({ data: { emails } });
      setResults(response.results);
      
      const invited = response.results.filter((r) => r.status === "invited").length;
      const reactivated = response.results.filter((r) => r.status === "reactivated").length;
      
      if (invited || reactivated) {
        onAdded();
        toastSuccess(`${invited} invited · ${reactivated} reactivated`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite readers");
    } finally {
      setIsLoading(false);
    }
  };

  const labels: Record<string, string> = {
    invited: "Invited",
    reactivated: "Reactivated",
    already_active: "Already active",
    invalid: "Invalid email",
    admin_account: "Administrator account",
    failed: "Could not invite",
  };

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Invite readers</h2>
        <Badge variant="info">Bulk</Badge>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[1fr_auto]">
        <textarea
          required
          value={emails}
          onChange={(e) => {
            setEmails(e.target.value);
            setResults([]);
            setError(null);
          }}
          placeholder="Reader email addresses, separated by commas or new lines"
          aria-label="Reader email addresses"
          rows={4}
          className="min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-all hover:bg-primary/90"
        >
          {isLoading ? <ButtonSpinner /> : "Invite readers"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <ul aria-label="Invitation results" className="mt-3 divide-y rounded-lg border bg-card">
          {results.map((result, index) => (
            <BulkInviteResultItem key={index} result={result} />
          ))}
        </ul>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        <p>
          <strong>Status meanings:</strong>
        </p>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Activity list item
function ActivityItem({ activity }: { activity: Summary["recent_activity"][number] }) {
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</span>
        <span className="font-medium">{activity.action}</span>
        {activity.target_email && (
          <span className="text-muted-foreground">· {activity.target_email}</span>
        )}
      </div>
      {activity.detail && (
        <p className="mt-1 text-xs text-muted-foreground">{activity.detail}</p>
      )}
    </li>
  );
}

function AdminPage() {
  const getMeFn = useServerFn(getMe);
  const adminSummaryFn = useServerFn(adminSummary);
  const adminReadersFn = useServerFn(adminReaders);
  const logoutFn = useServerFn(logout);
  
  const [view, setView] = useState<"checking" | "login" | "dashboard">("checking");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [readersWithProgress, setReadersWithProgress] = useState<ReaderWithProgress[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [s, r] = await Promise.all([adminSummaryFn(), adminReadersFn()]);
      setSummary(s);
      
      // Combine readers with their progress
      const combined = r.readers.map((reader) => ({
        ...reader,
        progress: r.progress[reader.email],
      }));
      setReadersWithProgress(combined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [adminSummaryFn, adminReadersFn]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await getMeFn();
        if (me.authenticated && me.role === "admin") {
          setView("dashboard");
          await refresh();
        } else {
          setView("login");
        }
      } catch {
        setView("login");
      }
    };
    checkAuth();
  }, [getMeFn, refresh]);

  const handleLogout = async () => {
    try {
      await logoutFn();
      setView("login");
      toastSuccess("Signed out successfully");
    } catch {
      toastError("Failed to sign out");
    }
  };

  const handleToggleActive = async (reader: ReaderRow) => {
    try {
      await adminUpdateReader({ data: { email: reader.email, active: !reader.active } });
      await refresh();
      toastSuccess(`Reader ${reader.active ? "revoked" : "activated"}`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to update reader");
    }
  };

  const handleDelete = async (email: string) => {
    try {
      await adminDeleteReader({ data: { email } });
      await refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to remove reader");
    }
  };

  const filteredReaders = readersWithProgress.filter(
    (r) => (r.email + r.display_name).toLowerCase().includes(filter.toLowerCase())
  );

  // Render loading state
  if (view === "checking") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Checking your session…</p>
        </div>
      </div>
    );
  }

  // Render login form
  if (view === "login") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ToastHost />
        <SiteHeader active="admin" />
        <AdminLogin onSignedIn={() => {
          setView("dashboard");
          refresh();
        }} />
      </div>
    );
  }

  // Render dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastHost />
      <SiteHeader
        active="admin"
        right={
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Sign out
            </button>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Reading room dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage readers and monitor activity
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isLoading ? <ButtonSpinner className="h-3 w-3" /> : "↻ Refresh"}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        {isLoading && !summary ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5 animate-pulse">
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="mt-2 h-3 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Readers whitelisted" value={summary.total_readers} icon="👥" />
            <StatCard label="Currently active" value={summary.active_readers} icon="✅" />
            <StatCard label="Stories in collection" value={summary.story_count} icon="📚" />
          </div>
        ) : null}

        {/* Bulk invite form */}
        <BulkInviteForm
          onAdded={() => {
            refresh();
          }}
        />

        {/* Reader list */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Reader list</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter readers…"
                className="w-48 rounded-lg border border-input bg-card pl-10 pr-4 py-1.5 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
            {isLoading && readersWithProgress.length === 0 ? (
              <div className="p-8">
                <Spinner size="md" />
                <p className="mt-2 text-sm text-muted-foreground">Loading readers…</p>
              </div>
            ) : filteredReaders.length === 0 ? (
              <EmptyState
                title="No readers match"
                description="Try adjusting your filter"
                icon="👥"
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Reader
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Added
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Last login
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Progress
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReaders.map((reader) => (
                    <ReaderRowItem
                      key={reader.email}
                      reader={reader}
                      progress={reader.progress}
                      onToggleActive={() => handleToggleActive(reader)}
                      onDelete={() => handleDelete(reader.email)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Activity log */}
        {summary && summary.recent_activity.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">Recent activity</h2>
            <ul className="mt-4 divide-y rounded-xl border bg-card">
              {summary.recent_activity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

// Utility function to truncate text
