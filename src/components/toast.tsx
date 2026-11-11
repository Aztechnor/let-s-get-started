import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "default" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  id?: string;
}

interface ToastState extends ToastOptions {
  show: boolean;
}

let notify: ((options: ToastOptions) => void) | null = null;

export function toast(options: string | ToastOptions): void {
  const toastOptions: ToastOptions = typeof options === "string" ? { message: options } : options;
  
  if (notify) {
    notify(toastOptions);
  }
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    notify = (options: ToastOptions) => {
      const id = options.id || Date.now().toString();
      const newToast: ToastState = {
        ...options,
        id,
        show: true,
        type: options.type || "default",
        duration: options.duration || 3000,
      };
      
      if (timers.current.has(id)) {
        window.clearTimeout(timers.current.get(id));
      }
      
      setToasts((prev) => [...prev, newToast]);
      
      const timer = window.setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, show: false } : t)));
      }, newToast.duration);
      
      timers.current.set(id, timer);
    };
    
    return () => {
      notify = null;
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  useEffect(() => {
    const visibleToasts = toasts.filter((t) => t.show);
    if (visibleToasts.length === 0 && toasts.length > 0) {
      const timer = window.setTimeout(() => {
        setToasts([]);
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [toasts]);

  const toastIcons: Record<ToastType, string> = {
    default: "ℹ️",
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ️",
  };

  const toastStyles: Record<ToastType, string> = {
    default: "bg-card border-border text-foreground",
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200",
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3" role="status" aria-live="polite">
      {toasts
        .filter((t) => t.show)
        .map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all",
              "max-w-sm animate-in slide-in-from-bottom-2 fade-in",
              toastStyles[toast.type]
            )}
          >
            <span className="text-lg" aria-hidden>
              {toastIcons[toast.type]}
            </span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
    </div>
  );
}

// Helper functions for specific toast types
export const toastSuccess = (message: string) => toast({ message, type: "success", duration: 3000 });
export const toastError = (message: string) => toast({ message, type: "error", duration: 4000 });
export const toastWarning = (message: string) => toast({ message, type: "warning", duration: 4000 });
export const toastInfo = (message: string) => toast({ message, type: "info", duration: 3000 });
