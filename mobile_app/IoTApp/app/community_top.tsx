import { getGlobalStats, type NetworkSummary } from '@/services/network_cache';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function scoreColor(score: number) {
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

export default function CommunityTopScreen() {
  const [rows, setRows] = useState<NetworkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    try {
      setError(null);
      const s = await getGlobalStats(force);
      setRows(s.top_dangerous_networks ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#2f95dc" /></View>;
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={rows}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No data yet.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ssid} numberOfLines={1}>{item.ssid}</Text>
              <Text style={styles.meta}>
                {item.total_scans} scans · {item.top_attacks?.slice(0, 2).join(' · ')}
              </Text>
            </View>
            <View style={[styles.scoreBox, { backgroundColor: scoreColor(item.avg_safety_score) }]}>
              <Text style={styles.scoreText}>{Math.round(item.avg_safety_score)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#c62828', textAlign: 'center', padding: 12 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rank: { width: 22, fontWeight: '700', color: '#555', textAlign: 'center' },
  ssid: { fontSize: 15, fontWeight: '600', color: '#111' },
  meta: { fontSize: 12, color: '#777', marginTop: 2 },
  scoreBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  scoreText: { color: '#fff', fontWeight: '700' },
});
