import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { readCache, writeCache } from '../lib/cache';
import { removeIncidentPhoto, uploadIncidentPhoto } from '../lib/photos';
import { supabase } from '../lib/supabase';
import type { Category, Incident, NewIncident, OneOnOne, Reportee } from '../lib/types';
import { uuid } from '../lib/uuid';
import { useAuth } from './auth';

type OutboxEntry = {
  kind: 'create';
  incident: Incident;
};

type DataValue = {
  loading: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncError: string | null;
  reportees: Reportee[];
  activeReportees: Reportee[];
  categories: Category[];
  incidents: Incident[];
  oneOnOnes: OneOnOne[];
  refresh: () => Promise<void>;
  flush: () => Promise<void>;
  /** Returns one incident per person the capture covered. */
  addIncident: (input: NewIncident) => Promise<Incident[]>;
  updateIncident: (id: string, patch: Partial<Incident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  addReportee: (name: string, role?: string) => Promise<Reportee>;
  updateReportee: (id: string, patch: Partial<Reportee>) => Promise<void>;
  addCategory: (label: string) => Promise<void>;
  logOneOnOne: (reporteeId: string, notes?: string) => Promise<void>;
};

const DataContext = createContext<DataValue | null>(null);

const INCIDENT_COLUMNS =
  'id, owner_id, reportee_id, occurred_at, sentiment, severity, themes, note, photo_path, group_id, discussed_at, created_at, updated_at';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [reportees, setReportees] = useState<Reportee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [oneOnOnes, setOneOnOnes] = useState<OneOnOne[]>([]);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);

  // Kept in a ref so flush() never closes over a stale queue.
  const outboxRef = useRef<OutboxEntry[]>([]);
  const flushingRef = useRef(false);

  const setOutboxPersisted = useCallback(
    (next: OutboxEntry[]) => {
      outboxRef.current = next;
      setOutbox(next);
      if (userId) void writeCache(userId, 'outbox', next);
    },
    [userId],
  );

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  const hydrateFromCache = useCallback(async (uid: string) => {
    const [cachedReportees, cachedCategories, cachedIncidents, cachedOutbox, cachedOneOnOnes] =
      await Promise.all([
        readCache<Reportee[]>(uid, 'reportees'),
        readCache<Category[]>(uid, 'categories'),
        readCache<Incident[]>(uid, 'incidents'),
        readCache<OutboxEntry[]>(uid, 'outbox'),
        readCache<OneOnOne[]>(uid, 'one_on_ones'),
      ]);

    if (cachedReportees) setReportees(cachedReportees);
    if (cachedCategories) setCategories(cachedCategories);
    if (cachedIncidents) setIncidents(cachedIncidents);
    if (cachedOneOnOnes) setOneOnOnes(cachedOneOnOnes);
    if (cachedOutbox) {
      outboxRef.current = cachedOutbox;
      setOutbox(cachedOutbox);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [r, c, i, o] = await Promise.all([
        supabase.from('reportees').select('*').order('name'),
        supabase.from('categories').select('*').order('sort_order').order('label'),
        supabase
          .from('incidents')
          .select(INCIDENT_COLUMNS)
          .order('occurred_at', { ascending: false })
          .limit(2000),
        supabase.from('one_on_ones').select('*').order('held_at', { ascending: false }),
      ]);

      const firstError = r.error ?? c.error ?? i.error ?? o.error;
      if (firstError) throw firstError;

      const remoteIncidents = (i.data ?? []) as Incident[];
      const pending = outboxRef.current.map((e) => e.incident);
      const merged = mergeIncidents(remoteIncidents, pending);

      setReportees((r.data ?? []) as Reportee[]);
      setCategories(dedupeCategories((c.data ?? []) as Category[]));
      setIncidents(merged);
      setOneOnOnes((o.data ?? []) as OneOnOne[]);
      setLastSyncError(null);

      await Promise.all([
        writeCache(userId, 'reportees', r.data ?? []),
        writeCache(userId, 'categories', dedupeCategories((c.data ?? []) as Category[])),
        writeCache(userId, 'incidents', merged),
        writeCache(userId, 'one_on_ones', o.data ?? []),
      ]);
    } catch (err) {
      setLastSyncError(messageOf(err));
    }
  }, [userId]);

  // -------------------------------------------------------------------------
  // Outbox flush
  // -------------------------------------------------------------------------

  const flush = useCallback(async () => {
    if (!userId || flushingRef.current) return;
    if (outboxRef.current.length === 0) return;

    flushingRef.current = true;
    setSyncing(true);
    try {
      // Copy: entries are removed one at a time so a mid-queue failure keeps
      // the rest of the work queued rather than losing it.
      for (const entry of [...outboxRef.current]) {
        const incident = entry.incident;
        try {
          let photoPath = incident.photo_path;
          if (!photoPath && incident.local_photo_uri) {
            photoPath = await uploadIncidentPhoto(userId, incident.id, incident.local_photo_uri);
          }

          const { error } = await supabase.from('incidents').upsert(
            {
              id: incident.id,
              owner_id: userId,
              reportee_id: incident.reportee_id,
              occurred_at: incident.occurred_at,
              sentiment: incident.sentiment,
              severity: incident.severity,
              themes: incident.themes,
              group_id: incident.group_id,
              note: incident.note,
              photo_path: photoPath,
            },
            { onConflict: 'id' },
          );
          if (error) throw error;

          setOutboxPersisted(outboxRef.current.filter((e) => e.incident.id !== incident.id));
          setIncidents((prev) =>
            prev.map((x) =>
              x.id === incident.id
                ? { ...x, pending: false, photo_path: photoPath ?? null, local_photo_uri: null }
                : x,
            ),
          );
          setLastSyncError(null);
        } catch (err) {
          // Network down, or the row is genuinely rejected. Keep it queued and
          // surface the reason; the next flush retries.
          setLastSyncError(messageOf(err));
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [userId, setOutboxPersisted]);

  // Initial load per signed-in user.
  useEffect(() => {
    let active = true;
    if (!userId) {
      setReportees([]);
      setCategories([]);
      setIncidents([]);
      setOneOnOnes([]);
      outboxRef.current = [];
      setOutbox([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      await hydrateFromCache(userId);
      if (!active) return;
      setLoading(false);
      await flush();
      if (!active) return;
      await refresh();
    })();

    return () => {
      active = false;
    };
  }, [userId, hydrateFromCache, refresh, flush]);

  // Retry the queue when the app comes back to the foreground, and on a timer
  // while anything is still waiting.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });
    return () => sub.remove();
  }, [flush]);

  useEffect(() => {
    if (outbox.length === 0) return;
    const timer = setInterval(() => void flush(), 30_000);
    return () => clearInterval(timer);
  }, [outbox.length, flush]);

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const persistIncidents = useCallback(
    (next: Incident[]) => {
      setIncidents(next);
      if (userId) void writeCache(userId, 'incidents', next);
    },
    [userId],
  );

  const addIncident = useCallback<DataValue['addIncident']>(
    async (input) => {
      if (!userId) throw new Error('Not signed in');
      if (input.reportee_ids.length === 0) throw new Error('Pick at least one person');

      const now = new Date().toISOString();
      // One row per person keeps each person's history and discussed_at
      // independent; the shared group id records that it was one observation.
      const groupId = input.reportee_ids.length > 1 ? uuid() : null;

      const created: Incident[] = input.reportee_ids.map((reporteeId) => ({
        id: uuid(),
        owner_id: userId,
        reportee_id: reporteeId,
        occurred_at: input.occurred_at,
        sentiment: input.sentiment,
        severity: input.severity,
        themes: input.themes,
        note: input.note,
        photo_path: null,
        group_id: groupId,
        discussed_at: null,
        created_at: now,
        updated_at: now,
        pending: true,
        local_photo_uri: input.local_photo_uri ?? null,
      }));

      // Optimistic first: the entries are on screen before the network is touched.
      persistIncidents(sortIncidents([...created, ...incidents]));
      setOutboxPersisted([
        ...outboxRef.current,
        ...created.map((incident) => ({ kind: 'create' as const, incident })),
      ]);
      void flush();
      return created;
    },
    [userId, incidents, persistIncidents, setOutboxPersisted, flush],
  );

  const updateIncident = useCallback<DataValue['updateIncident']>(
    async (id, patch) => {
      const current = incidents.find((x) => x.id === id);
      if (!current) return;
      const next = { ...current, ...patch, updated_at: new Date().toISOString() };
      persistIncidents(sortIncidents(incidents.map((x) => (x.id === id ? next : x))));

      if (current.pending) {
        // Still queued — amend the queued payload instead of hitting the API.
        setOutboxPersisted(
          outboxRef.current.map((e) =>
            e.incident.id === id ? { ...e, incident: { ...e.incident, ...patch } } : e,
          ),
        );
        void flush();
        return;
      }

      const { error } = await supabase
        .from('incidents')
        .update({
          reportee_id: next.reportee_id,
          occurred_at: next.occurred_at,
          sentiment: next.sentiment,
          severity: next.severity,
          themes: next.themes,
          note: next.note,
          photo_path: next.photo_path,
          discussed_at: next.discussed_at,
        })
        .eq('id', id);
      if (error) {
        setLastSyncError(error.message);
        throw error;
      }
    },
    [incidents, persistIncidents, setOutboxPersisted, flush],
  );

  const deleteIncident = useCallback<DataValue['deleteIncident']>(
    async (id) => {
      const current = incidents.find((x) => x.id === id);
      persistIncidents(incidents.filter((x) => x.id !== id));
      setOutboxPersisted(outboxRef.current.filter((e) => e.incident.id !== id));

      if (!current || current.pending) return;
      if (current.photo_path) await removeIncidentPhoto(current.photo_path);
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) setLastSyncError(error.message);
    },
    [incidents, persistIncidents, setOutboxPersisted],
  );

  const addReportee = useCallback<DataValue['addReportee']>(
    async (name, role) => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('reportees')
        .insert({ owner_id: userId, name: name.trim(), role: role?.trim() || null })
        .select()
        .single();
      if (error) throw error;
      const created = data as Reportee;
      setReportees((prev) => {
        const next = dedupeById([...prev, created]).sort((a, b) => a.name.localeCompare(b.name));
        void writeCache(userId, 'reportees', next);
        return next;
      });
      return created;
    },
    [userId, reportees],
  );

  const updateReportee = useCallback<DataValue['updateReportee']>(
    async (id, patch) => {
      if (!userId) return;
      setReportees((prev) => {
        const next = prev
          .map((r) => (r.id === id ? { ...r, ...patch } : r))
          .sort((a, b) => a.name.localeCompare(b.name));
        void writeCache(userId, 'reportees', next);
        return next;
      });

      const { error } = await supabase
        .from('reportees')
        .update({ name: patch.name, role: patch.role, archived: patch.archived })
        .eq('id', id);
      if (error) throw error;
    },
    [userId, reportees],
  );

  const addCategory = useCallback<DataValue['addCategory']>(
    async (label) => {
      if (!userId) return;
      const trimmed = label.trim();
      if (!trimmed) return;
      if (categories.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) return;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          owner_id: userId,
          label: trimmed,
          sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
        })
        .select()
        .single();
      if (error) throw error;

      // Functional update: a concurrent refresh() may already have stored this
      // row, and appending to a stale closure would duplicate it on screen.
      setCategories((prev) => {
        const next = dedupeCategories([...prev, data as Category]);
        void writeCache(userId, 'categories', next);
        return next;
      });
    },
    [userId, categories],
  );

  const logOneOnOne = useCallback<DataValue['logOneOnOne']>(
    async (reporteeId, notes) => {
      if (!userId) return;
      const heldAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('one_on_ones')
        .insert({ owner_id: userId, reportee_id: reporteeId, held_at: heldAt, notes: notes ?? null })
        .select()
        .single();
      if (error) throw error;

      const next = [data as OneOnOne, ...oneOnOnes];
      setOneOnOnes(next);
      void writeCache(userId, 'one_on_ones', next);

      // Everything captured up to now counts as discussed.
      const toMark = incidents.filter(
        (x) => x.reportee_id === reporteeId && !x.discussed_at && !x.pending,
      );
      if (toMark.length) {
        await supabase
          .from('incidents')
          .update({ discussed_at: heldAt })
          .in(
            'id',
            toMark.map((x) => x.id),
          );
        persistIncidents(
          incidents.map((x) =>
            toMark.some((m) => m.id === x.id) ? { ...x, discussed_at: heldAt } : x,
          ),
        );
      }
    },
    [userId, oneOnOnes, incidents, persistIncidents],
  );

  const activeReportees = useMemo(() => reportees.filter((r) => !r.archived), [reportees]);

  const value = useMemo<DataValue>(
    () => ({
      loading,
      syncing,
      pendingCount: outbox.length,
      lastSyncError,
      reportees,
      activeReportees,
      categories,
      incidents,
      oneOnOnes,
      refresh,
      flush,
      addIncident,
      updateIncident,
      deleteIncident,
      addReportee,
      updateReportee,
      addCategory,
      logOneOnOne,
    }),
    [
      loading,
      syncing,
      outbox.length,
      lastSyncError,
      reportees,
      activeReportees,
      categories,
      incidents,
      oneOnOnes,
      refresh,
      flush,
      addIncident,
      updateIncident,
      deleteIncident,
      addReportee,
      updateReportee,
      addCategory,
      logOneOnOne,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------

/** Themes are identified by their label, so a repeated label is one theme. */
function dedupeCategories(list: Category[]): Category[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = c.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

function sortIncidents(list: Incident[]): Incident[] {
  return [...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

/** Remote rows win, but anything still queued locally stays visible. */
function mergeIncidents(remote: Incident[], pending: Incident[]): Incident[] {
  const byId = new Map(remote.map((x) => [x.id, x]));
  for (const p of pending) if (!byId.has(p.id)) byId.set(p.id, { ...p, pending: true });
  return sortIncidents([...byId.values()]);
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err && 'message' in err) return String((err as any).message);
  return 'Unknown error';
}
