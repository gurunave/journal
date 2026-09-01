import type { Incident, Reportee, Sentiment } from './types';

export type RangeKey = '30d' | '90d' | '365d' | 'all';

export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '365d', label: '1 year', days: 365 },
  { key: 'all', label: 'All', days: null },
];

export function withinRange(incidents: Incident[], range: RangeKey, now = Date.now()): Incident[] {
  const days = RANGES.find((r) => r.key === range)?.days ?? null;
  if (days === null) return incidents;
  const cutoff = now - days * 86_400_000;
  return incidents.filter((i) => new Date(i.occurred_at).getTime() >= cutoff);
}

export type SentimentCounts = Record<Sentiment, number>;

export function countSentiments(incidents: Incident[]): SentimentCounts {
  const counts: SentimentCounts = { positive: 0, neutral: 0, concern: 0 };
  for (const i of incidents) counts[i.sentiment] += 1;
  return counts;
}

export type ReporteeStats = {
  reportee: Reportee;
  incidents: Incident[];
  total: number;
  counts: SentimentCounts;
  avgSeverity: number;
  /** positive − concern, normalised to [-1, 1]. 0 when there is nothing logged. */
  balance: number;
  lastAt: string | null;
  undiscussed: number;
};

export function statsByReportee(incidents: Incident[], reportees: Reportee[]): ReporteeStats[] {
  const grouped = new Map<string, Incident[]>();
  for (const i of incidents) {
    const list = grouped.get(i.reportee_id);
    if (list) list.push(i);
    else grouped.set(i.reportee_id, [i]);
  }

  return reportees
    .map((reportee) => {
      const list = grouped.get(reportee.id) ?? [];
      const counts = countSentiments(list);
      const total = list.length;
      const avgSeverity = total ? list.reduce((s, i) => s + i.severity, 0) / total : 0;
      const balance = total ? (counts.positive - counts.concern) / total : 0;
      const lastAt = list.reduce<string | null>(
        (max, i) => (!max || i.occurred_at > max ? i.occurred_at : max),
        null,
      );
      return {
        reportee,
        incidents: list,
        total,
        counts,
        avgSeverity,
        balance,
        lastAt,
        undiscussed: list.filter((i) => !i.discussed_at).length,
      };
    })
    .sort((a, b) => b.total - a.total || a.reportee.name.localeCompare(b.reportee.name));
}

/**
 * An incident can carry several themes, so it contributes a count to each one.
 * Totals therefore exceed the incident count — that is intended: this answers
 * "how often does this theme come up", not "how do incidents split".
 */
export function countCategories(incidents: Incident[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of incidents) {
    const themes = i.themes?.length ? i.themes : ['Untagged'];
    for (const theme of themes) {
      const key = theme.trim() || 'Untagged';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Buckets incidents into the last `weeks` ISO weeks, oldest first. */
export function weeklyTrend(
  incidents: Incident[],
  weeks = 12,
  now = Date.now(),
): { label: string; counts: SentimentCounts; total: number }[] {
  const week = 7 * 86_400_000;
  const buckets = Array.from({ length: weeks }, (_, idx) => {
    const end = now - (weeks - 1 - idx) * week;
    return {
      start: end - week,
      end,
      label: new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      counts: { positive: 0, neutral: 0, concern: 0 } as SentimentCounts,
      total: 0,
    };
  });

  for (const i of incidents) {
    const t = new Date(i.occurred_at).getTime();
    const bucket = buckets.find((b) => t > b.start && t <= b.end);
    if (bucket) {
      bucket.counts[i.sentiment] += 1;
      bucket.total += 1;
    }
  }

  return buckets.map(({ label, counts, total }) => ({ label, counts, total }));
}

/** Reportees with nothing logged recently — the ones easiest to overlook. */
export function staleReportees(
  stats: ReporteeStats[],
  days = 21,
  now = Date.now(),
): ReporteeStats[] {
  const cutoff = now - days * 86_400_000;
  return stats.filter((s) => !s.lastAt || new Date(s.lastAt).getTime() < cutoff);
}
