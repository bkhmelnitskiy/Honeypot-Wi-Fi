import { getItems } from '@/constants/db';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Scan = {
  id: number;
  network: string;
  safety_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  server_scan_id: string | null;
};

type SortKey = 'newest' | 'oldest' | 'safest' | 'unsafest';

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#9e9e9e';
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

function uploadStatus(scan: Scan): { label: string; color: string } {
  if (scan.server_scan_id) return { label: 'Uploaded', color: '#2e7d32' };
  if (scan.completed_at) return { label: 'Pending', color: '#f57c00' };
  return { label: 'Local only', color: '#9e9e9e' };
}

export default function HistoryScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setScans(getItems() as unknown as Scan[]);
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = scans;
    if (q) {
      list = list.filter((s) => (s.network ?? '').toLowerCase().includes(q));
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return (b.started_at ?? '').localeCompare(a.started_at ?? '');
        case 'oldest':
          return (a.started_at ?? '').localeCompare(b.started_at ?? '');
        case 'safest':
          return (b.safety_score ?? -1) - (a.safety_score ?? -1);
        case 'unsafest':
          return (a.safety_score ?? 101) - (b.safety_score ?? 101);
      }
    });
    return sorted;
  }, [scans, query, sort]);

  const sortLabels: Record<SortKey, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    safest: 'Safest first',
    unsafest: 'Unsafest first',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>History</Text>

        {/* Search + Filter row */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search networks"
              placeholderTextColor="#9a9a9a"
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, filterOpen && styles.filterButtonOpen]}
            onPress={() => setFilterOpen((v) => !v)}
          >
            <Ionicons name="options-outline" size={16} color="#222" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {filterOpen && (
          <View style={styles.filterPanel}>
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <Pressable
                key={key}
                style={[styles.filterChip, sort === key && styles.filterChipActive]}
                onPress={() => setSort(key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sort === key && styles.filterChipTextActive,
                  ]}
                >
                  {sortLabels[key]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Card list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query ? 'No matches.' : 'No scans yet — run a scan to get started.'}
            </Text>
          }
          renderItem={({ item }) => {
            const status = uploadStatus(item);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.networkName} numberOfLines={1}>
                    {item.network ?? '(unnamed)'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                    <Text style={styles.statusPillText}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.metaLabel}>Scan date</Text>
                    <Text style={styles.metaValue}>
                      {item.started_at ? item.started_at.slice(0, 10) : '—'}
                    </Text>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => router.push(`/network_details?id=${item.id}`)}
                    >
                      <Text style={styles.detailsText}>Details »</Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.scoreBox,
                      { backgroundColor: scoreColor(item.safety_score) },
                    ]}
                  >
                    <Text style={styles.scoreLabel}>Safety</Text>
                    <Text style={styles.scoreValue}>
                      {item.safety_score != null ? item.safety_score : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 12 },

  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 0 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 14,
    height: 40,
  },
  filterButtonOpen: { backgroundColor: '#eaf4fb', borderColor: '#9ec9e2' },
  filterText: { color: '#222', fontSize: 14, fontWeight: '500' },

  filterPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: { backgroundColor: '#2f95dc', borderColor: '#2f95dc' },
  filterChipText: { fontSize: 12, color: '#444' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

  listContent: { paddingVertical: 8, paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 48, fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  networkName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111', marginRight: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLeft: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, color: '#222', marginTop: 2 },
  detailsBtn: { marginTop: 8, alignSelf: 'flex-start' },
  detailsText: { color: '#2f95dc', fontSize: 13, fontWeight: '600' },

  scoreBox: {
    width: 84,
    height: 64,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreLabel: { color: '#fff', fontSize: 11, opacity: 0.9 },
  scoreValue: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
