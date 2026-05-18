import { getGlobalStats, type GlobalStats } from '@/services/network_cache';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function scoreColor(score: number) {
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

export default function CommunityStatsScreen() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    try {
      setError(null);
      const s = await getGlobalStats(force);
      setStats(s);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2f95dc" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
        />
      }
    >
      {error && <Text style={styles.error}>{error}</Text>}

      {stats && (
        <>
          <View style={styles.grid}>
            <Big title="Scans"     value={String(stats.total_scans)} />
            <Big title="Networks"  value={String(stats.total_networks)} />
            <Big title="Users"     value={String(stats.total_users)} />
            <Big
              title="Avg safety"
              value={String(Math.round(stats.avg_safety_score))}
              color={scoreColor(stats.avg_safety_score)}
            />
          </View>

          <Text style={styles.section}>Attack distribution</Text>
          <View style={styles.card}>
            {Object.entries(stats.attack_distribution).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowKey}>{k.replace(/_/g, ' ')}</Text>
                <Text style={styles.rowVal}>{v}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Top dangerous networks</Text>
          <View style={styles.card}>
            {stats.top_dangerous_networks.slice(0, 5).map((n) => (
              <View key={n.id} style={styles.row}>
                <Text style={styles.rowKey} numberOfLines={1}>{n.ssid}</Text>
                <Text style={[styles.rowVal, { color: scoreColor(n.avg_safety_score) }]}>
                  {Math.round(n.avg_safety_score)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Top contributors</Text>
          <View style={styles.card}>
            {stats.top_contributors.slice(0, 5).map((c) => (
              <View key={c.display_name} style={styles.row}>
                <Text style={styles.rowKey}>{c.display_name}</Text>
                <Text style={styles.rowVal}>{c.total_scans} scans</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Big({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.big}>
      <Text style={[styles.bigValue, color && { color }]}>{value}</Text>
      <Text style={styles.bigLabel}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  error: { color: '#c62828', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  big: {
    flexGrow: 1, minWidth: '46%',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#eee',
  },
  bigValue: { fontSize: 24, fontWeight: '700', color: '#111' },
  bigLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  section: { marginTop: 16, marginBottom: 6, fontWeight: '600', color: '#222', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#eee' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  rowKey: { flex: 1, color: '#222', marginRight: 8 },
  rowVal: { color: '#111', fontWeight: '600' },
});
