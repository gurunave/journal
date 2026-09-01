import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IncidentRow } from '../../src/components/IncidentRow';
import { Chip, EmptyState, Rule } from '../../src/components/ui';
import { dayKey, dayLabel } from '../../src/lib/format';
import { sentimentLabel, space, type, useTheme } from '../../src/lib/theme';
import { SENTIMENTS, type Incident, type Sentiment } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function Timeline() {
  const router = useRouter();
  const { c } = useTheme();
  const { incidents, reportees, refresh } = useData();

  const [query, setQuery] = useState('');
  const [reporteeFilter, setReporteeFilter] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const nameById = useMemo(
    () => new Map(reportees.map((r) => [r.id, r.name] as const)),
    [reportees],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((i) => {
      if (reporteeFilter && i.reportee_id !== reporteeFilter) return false;
      if (sentimentFilter && i.sentiment !== sentimentFilter) return false;
      if (!q) return true;
      const haystack = `${i.note} ${(i.themes ?? []).join(' ')} ${
        nameById.get(i.reportee_id) ?? ''
      }`;
      return haystack.toLowerCase().includes(q);
    });
  }, [incidents, query, reporteeFilter, sentimentFilter, nameById]);

  const sections = useMemo(
    () => groupByDay(collapseGroups(filtered, nameById)),
    [filtered, nameById],
  );

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <View style={styles.masthead}>
        <Text style={[type.eyebrow, { color: c.inkFaint }]}>
          {filtered.length} OF {incidents.length} ENTRIES
        </Text>
        <Text style={[type.display, { color: c.ink }]}>Record</Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes, themes, names"
          placeholderTextColor={c.inkFaint}
          autoCapitalize="none"
          returnKeyType="search"
          style={[type.body, styles.search, { color: c.ink, borderBottomColor: c.rule }]}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SENTIMENTS.map((s) => (
            <Chip
              key={s}
              label={sentimentLabel[s]}
              selected={sentimentFilter === s}
              onPress={() => setSentimentFilter(sentimentFilter === s ? null : s)}
            />
          ))}
          <View style={[styles.chipDivider, { backgroundColor: c.rule }]} />
          {reportees.map((r) => (
            <Chip
              key={r.id}
              label={r.name}
              selected={reporteeFilter === r.id}
              onPress={() => setReporteeFilter(reporteeFilter === r.id ? null : r.id)}
            />
          ))}
        </ScrollView>
      </View>
      <Rule strong />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.incident.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.inkFaint} />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={[type.eyebrow, { color: c.inkSoft }]}>{section.title.toUpperCase()}</Text>
            <View style={[styles.dayRule, { backgroundColor: c.rule }]} />
            <Text style={[type.meta, { color: c.inkFaint }]}>{section.data.length}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.itemRule, { backgroundColor: c.rule }]} />
        )}
        renderItem={({ item }) => (
          <IncidentRow
            incident={item.incident}
            reporteeName={nameById.get(item.incident.reportee_id) ?? 'Unknown'}
            alsoWith={item.alsoWith}
            onPress={() =>
              router.push({ pathname: '/incident/[id]', params: { id: item.incident.id } })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={incidents.length === 0 ? 'The record is empty' : 'No matches'}
            body={
              incidents.length === 0
                ? 'Capture the first thing you noticed and it will appear here.'
                : 'Try clearing the search or the filters.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

type Row = { incident: Incident; alsoWith: string[] };

/**
 * One capture about several people writes a row each. They are the same
 * observation, so the record shows them once, naming everyone it covered.
 * Names come from the filtered set, so filtering by a person still reads as
 * being about that person.
 */
function collapseGroups(incidents: Incident[], nameById: Map<string, string>): Row[] {
  const seenGroups = new Set<string>();
  const rows: Row[] = [];

  for (const incident of incidents) {
    if (!incident.group_id) {
      rows.push({ incident, alsoWith: [] });
      continue;
    }
    if (seenGroups.has(incident.group_id)) continue;
    seenGroups.add(incident.group_id);

    const alsoWith = incidents
      .filter((x) => x.group_id === incident.group_id && x.id !== incident.id)
      .map((x) => nameById.get(x.reportee_id) ?? 'Unknown');
    rows.push({ incident, alsoWith });
  }
  return rows;
}

function groupByDay(rows: Row[]): { title: string; data: Row[] }[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = dayKey(row.incident.occurred_at);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, data]) => ({ title: dayLabel(data[0].incident.occurred_at), data }));
}

const styles = StyleSheet.create({
  masthead: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.sm },
  filters: { padding: space.xl, paddingTop: space.lg, gap: space.lg },
  search: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  chipRow: { gap: space.sm, paddingRight: space.xl, alignItems: 'center' },
  chipDivider: { width: StyleSheet.hairlineWidth, height: 20, marginHorizontal: space.xs },
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.xl,
    paddingBottom: space.xs,
  },
  dayRule: { flex: 1, height: StyleSheet.hairlineWidth },
  itemRule: { height: StyleSheet.hairlineWidth, marginLeft: space.md + 2 },
});
