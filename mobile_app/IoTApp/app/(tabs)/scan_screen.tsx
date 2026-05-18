import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { honeypot, type AvailableNetwork, type DeviceStatus } from '@/services/honeypot';
import { runScan, type ScanProgress } from '@/services/scan_manager';
import { syncPending } from '@/services/sync_engine';

export default function ScanScreen() {
  const router = useRouter();
  const [networks, setNetworks] = useState<AvailableNetwork[]>([]);
  const [selected, setSelected] = useState<AvailableNetwork | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [refreshingList, setRefreshingList] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);

  const refreshDevice = useCallback(async () => {
    try {
      const s = await honeypot.ping();
      setDeviceStatus(s);
    } catch {
      setDeviceStatus(null);
    }
  }, []);

  const refreshNetworks = useCallback(async () => {
    setRefreshingList(true);
    try {
      const list = await honeypot.listNetworks(5);
      setNetworks(list);
    } catch (e: any) {
      Alert.alert('Could not list networks', e?.message ?? 'Try again.');
    } finally {
      setRefreshingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDevice();
      if (networks.length === 0) refreshNetworks();
    }, [refreshDevice, refreshNetworks, networks.length]),
  );

  useEffect(() => {
    const unsub = honeypot.onStateChange(() => refreshDevice());
    return () => { unsub(); };
  }, [refreshDevice]);

  const estimatedSec = 60;

  async function handleScan() {
    if (!selected || scanning) return;
    if (!deviceStatus) {
      Alert.alert('Honeypot offline', 'Pair or connect a Honeypot device first.', [
        { text: 'Pair device', onPress: () => router.push('/modal') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setScanning(true);
    setProgress({ scan_id: '', state: 'INITIALIZING', progress_pct: 0, elapsed_sec: 0 });
    try {
      const { localScanId } = await runScan(
        { ssid: selected.ssid, bssid: selected.bssid, duration_sec: estimatedSec },
        { onProgress: (p) => setProgress(p) },
      );
      // Fire-and-forget background sync once a scan is queued.
      syncPending().catch(() => {});
      router.push(`/network_details?id=${localScanId}`);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Unknown error');
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.scanButtonWrap}>
            <Pressable
              onPress={handleScan}
              disabled={!selected || scanning}
              style={({ pressed }) => [
                styles.scanButton,
                (!selected || scanning) && styles.scanButtonDisabled,
                pressed && styles.scanButtonPressed,
              ]}
            >
              {scanning && progress ? (
                <>
                  <Text style={styles.scanLabel}>{progress.progress_pct}%</Text>
                  <Text style={styles.scanEstTime}>{progress.state.toLowerCase()}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.scanLabel}>Scan</Text>
                  <Text style={styles.scanEstTime}>Est. time ~{estimatedSec}s</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.selectedLabel}>
              {selected ? `Selected: ${selected.ssid}` : 'No network selected'}
            </Text>
          </View>

          <Pressable style={styles.statusWrap} onPress={() => router.push('/settings_device')}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: deviceStatus ? '#2e7d32' : '#c62828' },
              ]}
            />
            <Text style={styles.statusText}>
              Device {deviceStatus ? 'online' : 'offline'}
            </Text>
            {deviceStatus && (
              <Text style={styles.statusBattery}>{deviceStatus.battery_pct}%</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available networks</Text>
          <TouchableOpacity onPress={() => router.push('/modal')}>
            <Text style={styles.manualLink}>Pair device »</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={networks}
          keyExtractor={(item) => item.bssid}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshingList} onRefresh={refreshNetworks} />
          }
          ListEmptyComponent={
            refreshingList ? (
              <ActivityIndicator style={{ marginTop: 32 }} color="#2f95dc" />
            ) : (
              <Text style={styles.empty}>
                No networks in range. Pull to refresh.
              </Text>
            )
          }
          renderItem={({ item }) => {
            const isSelected = selected?.bssid === item.bssid;
            return (
              <TouchableOpacity
                style={[styles.networkRow, isSelected && styles.networkRowSelected]}
                onPress={() => setSelected(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.encryption === 'OPEN' ? 'lock-open-outline' : 'lock-closed-outline'}
                  size={22}
                  color={isSelected ? '#2f95dc' : '#666'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.networkName, isSelected && styles.networkNameSelected]}>
                    {item.ssid}
                  </Text>
                  <Text style={styles.networkMeta}>
                    {item.encryption} · ch{item.channel} · {item.signal_dbm} dBm
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#2f95dc" />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  scanButtonWrap: {
    flex: 1,
    alignItems: 'center',
  },
  scanButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#2f95dc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  scanButtonDisabled: { backgroundColor: '#9ec9e2' },
  scanButtonPressed: { opacity: 0.85 },
  scanLabel: { color: '#fff', fontSize: 32, fontWeight: '700' },
  scanEstTime: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.9 },
  selectedLabel: { marginTop: 12, color: '#444', fontSize: 14 },

  statusWrap: {
    width: 90,
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 6,
  },
  statusText: { fontSize: 12, color: '#555', textAlign: 'center' },
  statusBattery: { fontSize: 11, color: '#888', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  manualLink: { color: '#2f95dc', fontSize: 14, fontWeight: '500' },

  listContent: { paddingVertical: 4, paddingBottom: 24 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 48, fontSize: 14 },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  networkRowSelected: { backgroundColor: '#eaf4fb', borderRadius: 8, paddingHorizontal: 12 },
  networkName: { fontSize: 16, color: '#222' },
  networkNameSelected: { fontWeight: '600', color: '#1c6fa3' },
  networkMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
});
