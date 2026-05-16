import { honeypot, type DeviceInfo, type DeviceStatus } from '@/services/honeypot';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function DeviceSettingsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [s, i] = await Promise.all([honeypot.ping(), honeypot.getDeviceInfo()]);
      setStatus(s);
      setInfo(i);
    } catch (e: any) {
      setError(e?.message ?? 'Device unreachable');
      setStatus(null);
      setInfo(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDisconnect() {
    Alert.alert('Disconnect honeypot?', 'You can pair again at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await honeypot.disconnect();
          load();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#2f95dc" /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }
    >
      <View style={styles.statusCard}>
        <View style={[styles.dot, { backgroundColor: status ? '#2e7d32' : '#c62828' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>
            {status ? 'Honeypot connected' : 'Honeypot offline'}
          </Text>
          {status && (
            <Text style={styles.statusSub}>
              Battery {status.battery_pct}% · uptime {Math.round(status.uptime_sec / 60)}m
            </Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>

      {info && (
        <View style={styles.card}>
          <Row label="Device ID" value={info.device_id} />
          <Row label="Firmware" value={info.firmware_version} />
          <Row label="Model" value={info.hardware_model} />
          <Row label="wlan0 MAC" value={info.wlan0_mac} />
          <Row label="wlan1 MAC" value={info.wlan1_mac} />
          <Row label="Storage free" value={`${info.storage_free_mb} MB`} />
          <Row label="Total scans" value={String(info.total_scans_performed)} />
        </View>
      )}

      <View style={{ gap: 10, marginTop: 16 }}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/modal')}
        >
          <Ionicons name="bluetooth-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Pair another device</Text>
        </Pressable>

        {status && (
          <Pressable
            style={({ pressed }) => [styles.btnDanger, pressed && { opacity: 0.85 }]}
            onPress={handleDisconnect}
          >
            <Ionicons name="close-circle-outline" size={18} color="#c62828" />
            <Text style={styles.btnDangerText}>Disconnect</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  statusTitle: { fontWeight: '700', color: '#111' },
  statusSub: { color: '#666', fontSize: 13, marginTop: 4 },
  error: { color: '#c62828', fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#eee',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f1f1',
  },
  rowLabel: { color: '#666' },
  rowValue: { color: '#111', fontWeight: '500' },

  btnPrimary: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#2f95dc', paddingVertical: 12, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDanger: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 12, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#f3c0c0',
  },
  btnDangerText: { color: '#c62828', fontWeight: '600' },
});
