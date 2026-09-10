import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export function Overlay(props: {
  id?: string;
  class?: string;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const restore = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  useEffect(() => {
    restore.current = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restore.current?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div
      id={props.id}
      ref={ref}
      class={props.class ? `bb-overlay ${props.class}` : "bb-overlay"}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (props.closeOnBackdrop !== false && e.target === ref.current) onCloseRef.current?.();
      }}
    >
      {props.children}
    </div>
  );
}

export function Modal(props: { class?: string; children: ComponentChildren }) {
  return (
    <div class={props.class ? `bb-modal ${props.class}` : "bb-modal"}>{props.children}</div>
  );
}
