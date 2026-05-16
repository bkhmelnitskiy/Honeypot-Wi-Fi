import { getAppPrefs, setAppPrefs, type AppPrefs } from '@/services/preferences';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

const THEMES: Array<AppPrefs['theme']> = ['system', 'light', 'dark'];
const LANGS: Array<AppPrefs['language']> = ['en', 'pl'];

export default function AppSettingsScreen() {
  const [prefs, setPrefs] = useState<AppPrefs>(getAppPrefs());

  function update(patch: Partial<AppPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setAppPrefs(next);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>Theme</Text>
      <View style={styles.row}>
        {THEMES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, prefs.theme === t && styles.chipActive]}
            onPress={() => update({ theme: t })}
          >
            <Text style={[styles.chipText, prefs.theme === t && styles.chipTextActive]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Language</Text>
      <View style={styles.row}>
        {LANGS.map((l) => (
          <Pressable
            key={l}
            style={[styles.chip, prefs.language === l && styles.chipActive]}
            onPress={() => update({ language: l })}
          >
            <Text style={[styles.chipText, prefs.language === l && styles.chipTextActive]}>
              {l.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Push notifications</Text>
          <Text style={styles.toggleSubtitle}>Get alerts when scans finish.</Text>
        </View>
        <Switch
          value={prefs.notifications}
          onValueChange={(v) => update({ notifications: v })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  section: { fontWeight: '600', color: '#222', marginTop: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  chipText: { color: '#444', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  toggleTitle: { fontWeight: '600', color: '#111' },
  toggleSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },
});
