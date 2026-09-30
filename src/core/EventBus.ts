type Handler = (payload?: any) => void;

class Bus {
  private handlers = new Map<string, Set<Handler>>();
  on(evt: string, h: Handler): () => void {
    if (!this.handlers.has(evt)) this.handlers.set(evt, new Set());
    this.handlers.get(evt)!.add(h);
    return () => this.off(evt, h);
  }
  off(evt: string, h: Handler) { this.handlers.get(evt)?.delete(h); }
  emit(evt: string, payload?: any) {
    this.handlers.get(evt)?.forEach(h => {
      try { h(payload); } catch (e) { console.error('[bus]', evt, e); }
    });
  }
}

/** Global event bus. Event names are documented in ARCHITECTURE.md. */
export const bus = new Bus();
