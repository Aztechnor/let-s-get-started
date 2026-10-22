import { useEffect, useRef, useState } from "react";

let notify: ((message: string) => void) | null = null;

export function toast(message: string): void {
  notify?.(message);
}

export function ToastHost() {
  const [state, setState] = useState<{ message: string; show: boolean }>({ message: "", show: false });
  const timer = useRef<number | null>(null);

  useEffect(() => {
    notify = (message) => {
      setState({ message, show: true });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setState((s) => ({ ...s, show: false }));
      }, 2900);
    };
    return () => {
      notify = null;
    };
  }, []);

  return (
    <div className={"toast" + (state.show ? " show" : "")} role="status" aria-live="polite">
      {state.message}
    </div>
  );
}
