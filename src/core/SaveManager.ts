// Persistence: IndexedDB preferred, localStorage fallback. Versioned schema with migrations.
import type { SaveData } from './types';
import { SAVE_VERSION, defaultSave, defaultMeta, defaultSettings } from './state';

const DB_NAME = 'a-thousand-doors';
const STORE = 'saves';
const KEY = 'slot0';
const LS_KEY = 'atd.save.slot0';
const LS_BACKUP = 'atd.save.backup';

type Migration = (data: any) => any;

/**
 * Migrations: index = version being migrated FROM.
 * v1 → v2: introduced persistent door states, keyring and player marks (locks & keys system).
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (d) => {
    const m = d.meta ?? {};
    const doors: Record<string, any> = {};
    // v1 stored door knowledge as knownDoors {used, lastDest, seen}
    for (const [id, rec] of Object.entries<any>(m.knownDoors ?? {})) {
      doors[id] = { state: rec.used > 0 ? 'opened' : 'seen', seen: true, used: rec.used ?? 0, lastDest: rec.lastDest };
    }
    m.doors = doors;
    delete m.knownDoors;
    m.keyring = m.keyring ?? {};
    m.map = m.map ?? { layout: {}, notes: {}, pins: [] };
    m.map.roomMarks = m.map.roomMarks ?? {};
    d.meta = m;
    d.version = 2;
    return d;
  },
};

export function migrate(raw: any): SaveData {
  if (!raw || typeof raw !== 'object') return defaultSave();
  let d = raw;
  let v = typeof d.version === 'number' ? d.version : 1;
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) break;
    d = m(d);
    v = d.version;
  }
  // Fill any missing fields defensively (forward compatibility & corruption repair).
  const base = defaultMeta();
  d.meta = { ...base, ...(d.meta ?? {}) };
  for (const k of Object.keys(base) as (keyof typeof base)[]) {
    const bv: any = base[k];
    const cv: any = (d.meta as any)[k];
    if (cv === undefined || cv === null || (typeof bv === 'object' && typeof cv !== 'object')) (d.meta as any)[k] = bv;
  }
  d.meta.map = { ...base.map, ...d.meta.map };
  d.meta.route = { ...base.route, ...d.meta.route };
  d.settings = { ...defaultSettings(), ...(d.settings ?? {}) };
  if (d.run && (typeof d.run.currentRoom !== 'string' || !Array.isArray(d.run.inventory))) d.run = null;
  if (d.run && !Array.isArray(d.run.trail)) {
    const path: string[] = Array.isArray(d.run.path) ? d.run.path : [];
    d.run.trail = path.slice(1).map((to, i) => ({ from: path[i], to, door: '', reverse: false }));
  }
  d.version = SAVE_VERSION;
  d.meta.version = SAVE_VERSION;
  return d as SaveData;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

export class SaveManager {
  private db: IDBDatabase | null = null;
  private ready: Promise<void>;
  private writing: Promise<void> = Promise.resolve();
  public backend: 'indexeddb' | 'localstorage' | 'memory' = 'memory';

  constructor() {
    this.ready = openDB().then(db => {
      this.db = db;
      this.backend = db ? 'indexeddb' : (hasLS() ? 'localstorage' : 'memory');
    });
  }

  async load(): Promise<SaveData> {
    await this.ready;
    let raw: any = null;
    try {
      if (this.db) raw = await idbGet(this.db, KEY);
    } catch (e) { console.warn('[save] idb read failed', e); }
    if (!raw && hasLS()) {
      try { const s = localStorage.getItem(LS_KEY); if (s) raw = JSON.parse(s); } catch (e) {
        console.warn('[save] corrupted primary save, trying backup', e);
        try { const b = localStorage.getItem(LS_BACKUP); if (b) raw = JSON.parse(b); } catch { raw = null; }
      }
    }
    return migrate(raw);
  }

  save(data: SaveData): Promise<void> {
    data.meta.updatedAt = Date.now();
    const snapshot = JSON.parse(JSON.stringify(data));
    this.writing = this.writing.then(async () => {
      await this.ready;
      try { if (this.db) await idbPut(this.db, KEY, snapshot); } catch (e) { console.warn('[save] idb write failed', e); }
      if (hasLS()) {
        try {
          const s = JSON.stringify(snapshot);
          const prev = localStorage.getItem(LS_KEY);
          if (prev) localStorage.setItem(LS_BACKUP, prev);
          localStorage.setItem(LS_KEY, s);
        } catch { /* quota — IndexedDB remains primary */ }
      }
    });
    return this.writing;
  }

  async reset(): Promise<void> {
    await this.ready;
    // A queued autosave must finish before deletion, or it can resurrect the slot.
    await this.writing;
    try { if (this.db) await idbPut(this.db, KEY, null); } catch { /* ignore */ }
    if (hasLS()) { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_BACKUP); }
  }
}

function hasLS(): boolean {
  try { return typeof localStorage !== 'undefined'; } catch { return false; }
}
function idbGet(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbPut(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
