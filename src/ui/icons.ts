import { paintIcon } from '../render/paint/props';

const cache = new Map<string, string>();
/** Data URL for an item icon painted procedurally. */
export function iconURL(icon: string): string {
  let u = cache.get(icon);
  if (!u) { u = paintIcon(icon).toDataURL(); cache.set(icon, u); }
  return u;
}
