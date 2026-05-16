import { getScanPrefs, setScanPrefs, type ScanPrefs } from '@/services/preferences';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const DURATIONS = [30, 60, 120, 300];
const ALL_MODULES = [
  'ARP_SPOOFING',
  'DNS_SPOOFING',
  'EVIL_TWIN',
  'DEAUTHENTICATION',
  'NETWORK_SCAN',
  'MALWARE_PROPAGATION',
];

export default function ScanSettingsScreen() {
  const [prefs, setPrefs] = useState<ScanPrefs>(getScanPrefs());

  function update(patch: Partial<ScanPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setScanPrefs(next);
  }

  function toggleModule(m: string) {
    const has = prefs.modules.includes(m);
    update({ modules: has ? prefs.modules.filter((x) => x !== m) : [...prefs.modules, m] });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>Default scan duration</Text>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <Pressable
            key={d}
            style={[styles.chip, prefs.default_duration_sec === d && styles.chipActive]}
            onPress={() => update({ default_duration_sec: d })}
          >
            <Text style={[styles.chipText, prefs.default_duration_sec === d && styles.chipTextActive]}>
              {d < 60 ? `${d}s` : `${d / 60}m`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Enabled attack modules</Text>
      <Text style={styles.help}>The honeypot will run only the modules you enable.</Text>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {ALL_MODULES.map((m) => {
          const active = prefs.modules.includes(m);
          return (
            <Pressable
              key={m}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleModule(m)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {m.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  section: { fontWeight: '600', color: '#222', marginTop: 12 },
  help: { color: '#666', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  chipText: { color: '#444', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
