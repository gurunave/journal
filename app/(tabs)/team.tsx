import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Avatar, Button, Card, Field, SectionHeader } from '../../src/components/ui';
import { pluralize, relativeTime } from '../../src/lib/format';
import { colors, radius, space } from '../../src/lib/theme';
import { useAuth } from '../../src/state/auth';
import { useData } from '../../src/state/store';

export default function Team() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    reportees,
    incidents,
    categories,
    addReportee,
    updateReportee,
    addCategory,
    pendingCount,
    syncing,
    lastSyncError,
    flush,
  } = useData();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const lastByReportee = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of incidents) {
      const current = map.get(i.reportee_id);
      if (!current || i.occurred_at > current) map.set(i.reportee_id, i.occurred_at);
    }
    return map;
  }, [incidents]);

  const countByReportee = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidents) map.set(i.reportee_id, (map.get(i.reportee_id) ?? 0) + 1);
    return map;
  }, [incidents]);

  const visible = reportees.filter((r) => showArchived || !r.archived);

  async function onAdd() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addReportee(name, role);
      setName('');
      setRole('');
    } catch (err) {
      Alert.alert('Could not add', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function onAddCategory() {
    if (!newCategory.trim()) return;
    try {
      await addCategory(newCategory);
      setNewCategory('');
    } catch (err) {
      Alert.alert('Could not add theme', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.block}>
        <SectionHeader title="Add a reportee" />
        <Card style={{ gap: space.md }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
          <Field
            label="Role (optional)"
            value={role}
            onChangeText={setRole}
            placeholder="e.g. Backend Engineer"
            onSubmitEditing={onAdd}
          />
          <Button title="Add" onPress={onAdd} loading={busy} disabled={!name.trim()} />
        </Card>
      </View>

      <View style={styles.block}>
        <SectionHeader
          title={`Team · ${visible.length}`}
          action={
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show archived</Text>
              <Switch
                value={showArchived}
                onValueChange={setShowArchived}
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>
          }
        />
        {visible.length === 0 ? (
          <Card>
            <Text style={styles.hint}>No one added yet.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {visible.map((r, idx) => {
              const last = lastByReportee.get(r.id);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push({ pathname: '/reportee/[id]', params: { id: r.id } })}
                  style={({ pressed }) => [
                    styles.personRow,
                    idx > 0 && styles.personRowBorder,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Avatar name={r.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, r.archived && { color: colors.textFaint }]}>
                      {r.name}
                      {r.archived ? ' · archived' : ''}
                    </Text>
                    <Text style={styles.personMeta}>
                      {r.role ? `${r.role} · ` : ''}
                      {pluralize(countByReportee.get(r.id) ?? 0, 'entry', 'entries')}
                      {last ? ` · last ${relativeTime(last)}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => void updateReportee(r.id, { archived: !r.archived })}
                  >
                    <Text style={styles.rowAction}>{r.archived ? 'Restore' : 'Archive'}</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </Card>
        )}
      </View>

      <View style={styles.block}>
        <SectionHeader title={`Themes · ${categories.length}`} />
        <Card style={{ gap: space.md }}>
          <Text style={styles.hint}>
            Themes are the one-tap tags on the capture screen. Keep the list short so picking one
            stays instant.
          </Text>
          <View style={styles.tagRow}>
            {categories.map((c) => (
              <View key={c.id} style={styles.tag}>
                <Text style={styles.tagText}>{c.label}</Text>
              </View>
            ))}
          </View>
          <Field
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="Add a theme"
            onSubmitEditing={onAddCategory}
            returnKeyType="done"
          />
          <Button
            title="Add theme"
            variant="secondary"
            onPress={onAddCategory}
            disabled={!newCategory.trim()}
          />
        </Card>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Account" />
        <Card style={{ gap: space.md }}>
          <Text style={styles.hint}>Signed in as {user?.email ?? 'unknown'}</Text>
          <Text style={styles.hint}>
            {pendingCount === 0
              ? 'Everything is synced.'
              : `${pendingCount} entr${pendingCount === 1 ? 'y' : 'ies'} waiting to sync${
                  syncing ? ' (in progress)' : ''
                }.`}
          </Text>
          {lastSyncError ? <Text style={styles.error}>Last sync error: {lastSyncError}</Text> : null}
          {pendingCount > 0 ? (
            <Button title="Retry sync now" variant="secondary" onPress={() => void flush()} />
          ) : null}
          <Button title="Sign out" variant="danger" onPress={() => void signOut()} />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.xl,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  block: { gap: space.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  personRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderRadius: 0,
  },
  personName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  personMeta: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  rowAction: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  switchLabel: { color: colors.textFaint, fontSize: 12 },
  hint: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  tagText: { color: colors.textDim, fontSize: 13 },
});
