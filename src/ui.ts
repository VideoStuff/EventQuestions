import { useCallback, useState } from "react";

/**
 * A set of open section IDs, remembered in this browser (just a convenience: if the
 * browser won't store it, everything still works for the visit).
 */
export function useOpenSet(key: string, initial: string[]) {
  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {}
    return new Set(initial);
  });
  const save = (s: Set<string>) => {
    try { localStorage.setItem(key, JSON.stringify([...s])); } catch {}
    return s;
  };
  const toggle = useCallback((id: string, force?: boolean) => {
    setOpen((prev) => {
      const next = new Set(prev);
      const want = force ?? !next.has(id);
      if (want) next.add(id); else next.delete(id);
      return save(next);
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const setAll = useCallback((ids: string[]) => setOpen(save(new Set(ids))), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { open, toggle, setAll };
}

/** Card open/closed state for this visit only. New cards open; existing ones start closed. */
export function useCardOpen() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string, force?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (force ?? !next.has(id)) next.add(id); else next.delete(id);
      return next;
    });
  return { open, toggle };
}
