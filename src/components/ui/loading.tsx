import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Spinner component - A simple, accessible loading spinner
 */
export function Spinner({
  className,
  size = "md",
  label = "Loading",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  return (
    <div className="flex items-center justify-center gap-3" role="status" aria-label={label}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizes[size],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Inline spinner for buttons
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        "h-4 w-4",
        className
      )}
      aria-hidden
    />
  );
}

/**
 * Loading overlay for full-page or section loading
 */
export function LoadingOverlay({
  message = "Loading",
}: {
  message?: string | ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-xl">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loading component - Creates placeholder content
 */
export function Skeleton({
  className,
  variant = "text",
}: {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}) {
  const baseClasses = "animate-pulse bg-muted";
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      aria-hidden="true"
    />
  );
}

/**
 * Book card skeleton for library loading
 */
export function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="aspect-[3/4] w-full" variant="rectangular" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-4">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Chapter list skeleton
 */
export function ChapterListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="h-8 w-8" variant="circular" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Reader list skeleton
 */
export function ReaderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10" variant="circular" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 py-12 text-center",
        className
      )}
    >
      {icon && <div className="text-muted-foreground/50">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({
  icon,
  title,
  description,
  retryAction,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  retryAction?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 py-12 text-center text-destructive",
        className
      )}
    >
      {icon && <div className="text-destructive/50">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {retryAction && (
        <button
          onClick={retryAction.onClick}
          className="rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          {retryAction.label}
        </button>
      )}
    </div>
  );
}

/**
 * Progress bar for reading progress
 */
export function ProgressBar({
  value,
  max,
  className,
  showLabel = false,
}: {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        {showLabel && (
          <>
            <span>Progress</span>
            <span>{percentage}%</span>
          </>
        )}
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Badge component for status indicators
 */
export function Badge({
  variant = "default",
  children,
  className,
  dot = false,
}: {
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "secondary";
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-primary text-primary-foreground",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    destructive: "bg-destructive/10 text-destructive",
    secondary: "bg-secondary text-secondary-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-yellow-500",
            variant === "destructive" && "bg-destructive",
            variant === "primary" && "bg-primary",
            variant === "default" && "bg-muted-foreground"
          )}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Tooltip wrapper for better UX
 */
export function TooltipWrapper({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={cn(
          "absolute z-10 w-max rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
          side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
          side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
        )}
        role="tooltip"
      >
        {content}
        <span
          className={cn(
            "absolute -z-10 h-2 w-2 rotate-45 rounded-[1px] border-r border-b bg-card",
            side === "top" && "-bottom-1 left-1/2 -translate-x-1/2 border-r-card border-b-card",
            side === "bottom" && "-top-1 left-1/2 -translate-x-1/2 border-r-card border-b-card",
            side === "left" && "-right-1 top-1/2 -translate-y-1/2 border-r-card border-b-card",
            side === "right" && "-left-1 top-1/2 -translate-y-1/2 border-r-card border-b-card"
          )}
        />
      </div>
    </div>
  );
}
