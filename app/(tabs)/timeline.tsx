import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import { IncidentRow } from '../../src/components/IncidentRow';
import { Chip, EmptyState, Field } from '../../src/components/ui';
import { dayKey, dayLabel } from '../../src/lib/format';
import { colors, sentimentLabel, space } from '../../src/lib/theme';
import { SENTIMENTS, type Incident, type Sentiment } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function Timeline() {
  const router = useRouter();
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

  const sections = useMemo(() => groupByDay(filtered), [filtered]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes, themes, names…"
          autoCapitalize="none"
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SENTIMENTS.map((s) => (
            <Chip
              key={s}
              compact
              label={sentimentLabel[s]}
              selected={sentimentFilter === s}
              onPress={() => setSentimentFilter(sentimentFilter === s ? null : s)}
            />
          ))}
          <View style={styles.chipDivider} />
          {reportees.map((r) => (
            <Chip
              key={r.id}
              compact
              label={r.name}
              selected={reporteeFilter === r.id}
              onPress={() => setReporteeFilter(reporteeFilter === r.id ? null : r.id)}
            />
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textDim}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <IncidentRow
            incident={item}
            reporteeName={nameById.get(item.reportee_id) ?? 'Unknown'}
            onPress={() => router.push({ pathname: '/incident/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title={incidents.length === 0 ? 'Nothing captured yet' : 'No matches'}
            body={
              incidents.length === 0
                ? 'Head to Capture and log the first thing you noticed.'
                : 'Try clearing the search or filters.'
            }
          />
        }
      />
    </View>
  );
}

function groupByDay(incidents: Incident[]): { title: string; data: Incident[] }[] {
  const groups = new Map<string, Incident[]>();
  for (const i of incidents) {
    const key = dayKey(i.occurred_at);
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, data]) => ({ title: dayLabel(data[0].occurred_at), data }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { padding: space.lg, paddingBottom: space.sm, gap: space.md },
  chipRow: { gap: space.sm, paddingRight: space.lg, alignItems: 'center' },
  chipDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: space.xs,
  },
  list: { paddingBottom: space.xxl, paddingHorizontal: space.xs },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xs,
  },
  sectionTitle: { color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  sectionCount: { color: colors.textFaint, fontSize: 11 },
});
