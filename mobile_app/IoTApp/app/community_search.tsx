import { searchNetworks, type NetworkSummary } from '@/services/network_cache';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function scoreColor(score: number) {
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

export default function CommunitySearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NetworkSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchNetworks(query.trim());
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#888" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search SSID..."
          placeholderTextColor="#9a9a9a"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 16 }} color="#2f95dc" />}

      <FlatList
        data={results}
        keyExtractor={(n) => n.id || `${n.ssid}-${n.bssid}`}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          !loading && query.length >= 2 ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : query.length < 2 ? (
            <Text style={styles.empty}>Type at least 2 characters.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.scoreBox, { backgroundColor: scoreColor(item.avg_safety_score) }]}>
              <Text style={styles.scoreText}>{Math.round(item.avg_safety_score)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ssid} numberOfLines={1}>{item.ssid}</Text>
              <Text style={styles.meta}>
                {item.total_scans} scans · {item.bssid}
              </Text>
              {item.top_attacks?.length > 0 && (
                <Text style={styles.attacks} numberOfLines={1}>
                  {item.top_attacks.slice(0, 3).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  searchWrap: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: '#222' },

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
  scoreBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  scoreText: { color: '#fff', fontWeight: '700' },
  ssid: { fontSize: 15, fontWeight: '600', color: '#111' },
  meta: { fontSize: 12, color: '#777', marginTop: 2 },
  attacks: { fontSize: 11, color: '#c62828', marginTop: 4 },
});
