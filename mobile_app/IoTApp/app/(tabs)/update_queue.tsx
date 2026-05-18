import {
  getAllQueueRows,
  getScanByClientId,
  removeQueueRow,
  type Scan,
  type UploadQueueRow,
} from '@/constants/db';
import { syncPending, syncSingle } from '@/services/sync_engine';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QueueRow = UploadQueueRow & { scan: Scan | null };

function statusColor(status: UploadQueueRow['status']) {
  switch (status) {
    case 'DONE':      return '#2e7d32';
    case 'IN_FLIGHT': return '#1c6fa3';
    case 'FAILED':    return '#c62828';
    default:          return '#f57c00';
  }
}

export default function UploadQueueScreen() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const all = getAllQueueRows();
    setRows(all.map((r) => ({ ...r, scan: getScanByClientId(r.client_scan_id) })));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSyncAll() {
    if (syncing) return;
    setSyncing(true);
    try {
      const r = await syncPending();
      if (r.failed > 0) {
        Alert.alert('Some uploads failed', `${r.uploaded} succeeded, ${r.failed} failed.`);
      } else if (r.uploaded === 0 && r.attempted === 0) {
        Alert.alert('Nothing to sync', 'The queue is empty.');
      }
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message ?? 'Unknown error');
    } finally {
      setSyncing(false);
      load();
    }
  }

  async function handleRetry(row: QueueRow) {
    try {
      await syncSingle(row.client_scan_id);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      load();
    }
  }

  function handleDelete(row: QueueRow) {
    Alert.alert('Remove from queue?', 'The local scan stays in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => { removeQueueRow(row.client_scan_id); load(); },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Upload queue</Text>
          <Pressable
            style={({ pressed }) => [styles.syncBtn, (pressed || syncing) && { opacity: 0.7 }]}
            onPress={handleSyncAll}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync all'}</Text>
          </Pressable>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); setRefreshing(false); }}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Queue is empty — finished scans appear here while they wait for an internet connection.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.network} numberOfLines={1}>
                  {item.scan?.network ?? item.client_scan_id}
                </Text>
                <View style={[styles.pill, { backgroundColor: statusColor(item.status) }]}>
                  <Text style={styles.pillText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Queued {item.enqueued_at.slice(0, 16).replace('T', ' ')}
                {item.attempts > 0 && ` · ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}`}
              </Text>
              {item.last_error && (
                <Text style={styles.error}>{item.last_error}</Text>
              )}
              <View style={styles.actions}>
                {(item.status === 'FAILED' || item.status === 'PENDING') && (
                  <Pressable
                    style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                    onPress={() => handleRetry(item)}
                  >
                    <Ionicons name="refresh" size={14} color="#2f95dc" />
                    <Text style={styles.actionText}>Retry</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={14} color="#c62828" />
                  <Text style={[styles.actionText, { color: '#c62828' }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2f95dc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  list: { paddingBottom: 24 },
  empty: { color: '#888', textAlign: 'center', marginTop: 48, paddingHorizontal: 24, lineHeight: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  network: { flex: 1, fontWeight: '600', color: '#111', marginRight: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '600', fontSize: 10, letterSpacing: 0.5 },
  meta: { color: '#888', fontSize: 12, marginTop: 6 },
  error: { color: '#c62828', fontSize: 12, marginTop: 4 },

  actions: { flexDirection: 'row', gap: 14, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: '#2f95dc', fontWeight: '600', fontSize: 13 },
});
