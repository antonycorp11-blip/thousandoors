// Minimal DOM helpers for the HTML interface layer.
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function svg(markup: string): HTMLElement {
  const s = document.createElement('span');
  s.innerHTML = markup;
  return s.firstElementChild as HTMLElement;
}

export const ICONS = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M6 9h12l-1 11H7L6 9z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M9.5 13h5"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  journal: '<svg viewBox="0 0 24 24"><path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v18M11 8h5M11 11h5"/></svg>',
  turn: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M6 21v-4h4"/></svg>',
  heart: '<svg class="heart" viewBox="0 0 16 14"><path d="M8 13S1 8.6 1 4.6A3.4 3.4 0 0 1 8 3a3.4 3.4 0 0 1 7 1.6C15 8.6 8 13 8 13z"/></svg>',
};

export function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
