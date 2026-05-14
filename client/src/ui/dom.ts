/** Tiny DOM builder used everywhere in the UI layer. */
export function el<T extends HTMLElement>(
  tag: string,
  cls?: string,
  text?: string,
): T {
  const e = document.createElement(tag) as T;
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
