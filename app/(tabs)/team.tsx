import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemePicker } from '../../src/components/ThemePicker';
import { Avatar, Button, Chip, Field, Rule, Section } from '../../src/components/ui';
import { pluralize, relativeTime } from '../../src/lib/format';
import { space, type, useTheme } from '../../src/lib/theme';
import { useAuth } from '../../src/state/auth';
import { useData } from '../../src/state/store';

export default function Team() {
  const router = useRouter();
  const { c } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.masthead}>
          <Text style={[type.eyebrow, { color: c.inkFaint }]}>
            {pluralize(visible.length, 'person', 'people')}
          </Text>
          <Text style={[type.display, { color: c.ink }]}>Team</Text>
        </View>
        <Rule strong />

        <Section
          title="Roster"
          right={
            <View style={styles.switchRow}>
              <Text style={[type.meta, { color: c.inkFaint }]}>Archived</Text>
              <Switch
                value={showArchived}
                onValueChange={setShowArchived}
                trackColor={{ true: c.accent, false: c.rule }}
              />
            </View>
          }
        >
          {visible.length === 0 ? (
            <Text style={[type.prose, { color: c.inkFaint }]}>No one added yet.</Text>
          ) : (
            <View>
              {visible.map((r, idx) => {
                const last = lastByReportee.get(r.id);
                return (
                  <View key={r.id}>
                    {idx > 0 ? <Rule /> : null}
                    <Pressable
                      onPress={() => router.push({ pathname: '/reportee/[id]', params: { id: r.id } })}
                      style={({ pressed }) => [
                        styles.personRow,
                        pressed && { backgroundColor: c.sunken },
                      ]}
                    >
                      <Avatar name={r.name} size={38} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[type.heading, { color: r.archived ? c.inkFaint : c.ink }]}
                          numberOfLines={1}
                        >
                          {r.name}
                        </Text>
                        <Text style={[type.meta, { color: c.inkFaint }]}>
                          {r.role ? `${r.role} · ` : ''}
                          {pluralize(countByReportee.get(r.id) ?? 0, 'entry', 'entries')}
                          {last ? ` · last ${relativeTime(last)}` : ''}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={10}
                        onPress={() => void updateReportee(r.id, { archived: !r.archived })}
                      >
                        <Text style={[type.eyebrow, { color: c.accent }]}>
                          {r.archived ? 'Restore' : 'Archive'}
                        </Text>
                      </Pressable>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        <Section title="Add someone">
          <View style={{ gap: space.lg }}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
            <Field
              label="Role"
              value={role}
              onChangeText={setRole}
              placeholder="Optional"
              onSubmitEditing={onAdd}
            />
            <Button title="Add to roster" onPress={onAdd} loading={busy} disabled={!name.trim()} />
          </View>
        </Section>

        <Section title={`Themes · ${categories.length}`}>
          <Text style={[type.prose, { color: c.inkSoft }]}>
            Themes are the one-tap tags on the capture screen. Keep the list short so picking one
            stays instant.
          </Text>
          <View style={styles.tagRow}>
            {categories.map((x) => (
              <Chip key={x.id} label={x.label} />
            ))}
          </View>
          <View style={{ gap: space.lg }}>
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
          </View>
        </Section>

        <Section title="Appearance">
          <ThemePicker />
        </Section>

        <Section title="Account">
          <View style={{ gap: space.md }}>
            <Text style={[type.prose, { color: c.inkSoft }]}>{user?.email ?? 'unknown'}</Text>
            <Text style={[type.meta, { color: c.inkFaint }]}>
              {pendingCount === 0
                ? 'Everything is synced.'
                : `${pluralize(pendingCount, 'entry', 'entries')} waiting to sync${
                    syncing ? ' · in progress' : ''
                  }.`}
            </Text>
            {lastSyncError ? (
              <Text style={[type.small, { color: c.danger }]}>Last sync error: {lastSyncError}</Text>
            ) : null}
          </View>
          <View style={{ gap: space.md }}>
            {pendingCount > 0 ? (
              <Button title="Retry sync now" variant="secondary" onPress={() => void flush()} />
            ) : null}
            <Button title="Sign out" variant="danger" onPress={() => void signOut()} />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.xl,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  masthead: { gap: space.sm },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
