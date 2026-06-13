import { avgSafetyScore, countQueue, countScans, getItems, type Scan } from '@/constants/db';
import { useAuth } from '@/hooks/use_auth';
import { honeypot, type DeviceStatus } from '@/services/honeypot';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#9e9e9e';
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recent, setRecent] = useState<Scan[]>([]);
  const [scansTotal, setScansTotal] = useState(0);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);

  const refresh = useCallback(() => {
    const all = getItems();
    setRecent(all.slice(0, 5));
    setScansTotal(countScans());
    setPendingUploads(countQueue('PENDING') + countQueue('FAILED'));
    setAvgScore(avgSafetyScore());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    let mounted = true;

    const updateDeviceStatus = async () => {
      try {
        const status = await honeypot.ping();
        if (mounted) setDeviceStatus(status);
      } catch {
        if (mounted) setDeviceStatus(null);
      }
    };

    updateDeviceStatus();

    const interval = setInterval(updateDeviceStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hi, {user?.display_name?.split(' ')[0] ?? 'there'}</Text>
            <Text style={styles.subhello}>Overview at a glance</Text>
          </View>
          <Pressable
            style={styles.deviceChip}
            onPress={() => router.push('/settings_device')}
          >
            <View style={[styles.dot, { backgroundColor: deviceStatus ? '#2e7d32' : '#c62828' }]} />
            <Text style={styles.deviceChipText}>
              {deviceStatus ? `Honeypot · ${deviceStatus.battery_pct}%` : 'No device'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat title="Total scans" value={String(scansTotal)} icon="analytics-outline" />
          <Stat
            title="Avg safety"
            value={avgScore != null ? String(Math.round(avgScore)) : '—'}
            icon="shield-checkmark-outline"
            color={scoreColor(avgScore)}
          />
          <Stat
            title="Pending"
            value={String(pendingUploads)}
            icon="cloud-upload-outline"
            onPress={() => router.push('/update_queue')}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent scans</Text>
          <Pressable onPress={() => router.push('/My_networks')}>
            <Text style={styles.sectionLink}>See all »</Text>
          </Pressable>
        </View>

        <FlatList
          data={recent}
          keyExtractor={(s) => String(s.id)}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No scans yet — run your first scan from the Scan tab.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.recentRow}
              onPress={() => router.push(`/network_details?id=${item.id}`)}
            >
              <View style={[styles.scorePill, { backgroundColor: scoreColor(item.safety_score) }]}>
                <Text style={styles.scorePillText}>
                  {item.safety_score != null ? Math.round(item.safety_score) : '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentNetwork} numberOfLines={1}>{item.network}</Text>
                <Text style={styles.recentDate}>
                  {item.started_at ? item.started_at.slice(0, 16).replace('T', ' ') : '—'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function Stat({
  title, value, icon, color, onPress,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
}) {
  const Box = onPress ? Pressable : View;
  return (
    <Box style={styles.stat} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color ?? '#2f95dc'} />
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hello: { fontSize: 22, fontWeight: '700', color: '#111' },
  subhello: { color: '#666', marginTop: 2 },

  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  deviceChipText: { fontSize: 12, color: '#222', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 4,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111' },
  statTitle: { fontSize: 12, color: '#666' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  sectionLink: { color: '#2f95dc', fontSize: 13, fontWeight: '600' },

  empty: { color: '#999', textAlign: 'center', marginTop: 32, fontSize: 14 },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  scorePill: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  scorePillText: { color: '#fff', fontWeight: '700' },
  recentNetwork: { fontWeight: '600', color: '#111' },
  recentDate: { color: '#888', fontSize: 12, marginTop: 2 },
});
