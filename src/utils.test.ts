import { Window } from "happy-dom";
import type { JSX } from "hono/jsx/jsx-runtime";

export const window = (globalThis.window ??
  new Window()) as unknown as globalThis.Window;

export function createDocumentFragment() {
  return window.document.createDocumentFragment();
}

export function createElement<
  K extends keyof HTMLElementTagNameMap & keyof JSX.IntrinsicElements[K]
>(
  tagName: K,
  props?: Partial<JSX.IntrinsicElements[K]>,
  children?: Iterable<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const element = window.document.createElement(tagName);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value != undefined && value !== false)
      element.setAttribute(key, value as string);
  }

  if (children) {
    for (const child of children) {
      if (typeof child === "string") {
        element.appendChild(window.document.createTextNode(child));
      } else if (child) {
        element.appendChild(child);
      }
    }
  }

  return element;
}
