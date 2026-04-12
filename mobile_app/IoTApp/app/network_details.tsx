import { getItemById } from '@/constants/db';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Scan = {
  id: number;
  server_scan_id: string;
  client_scan_id: string;
  network: string;
  safety_score: number;
  scan_duration_sec: number;
  attacks: string;
  device_hardware_id: string;
  firmware_version: string;
  started_at: string;
  completed_at: string;
};

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#888';
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value != null && value !== '' ? String(value) : '—'}</Text>
    </View>
  );
}

export default function NetworkDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scan = id ? (getItemById(Number(id)) as Scan | null) : null;

  if (!scan) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Scan not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.networkName}>{scan.network ?? '(unnamed)'}</Text>

      <View style={[styles.scoreBadge, { backgroundColor: scoreColor(scan.safety_score) }]}>
        <Text style={styles.scoreText}>
          Safety score: {scan.safety_score != null ? scan.safety_score : '—'}
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="Started at" value={scan.started_at} />
        <Row label="Completed at" value={scan.completed_at} />
        <Row label="Duration (s)" value={scan.scan_duration_sec} />
        <Row label="Attacks detected" value={scan.attacks} />
        <Row label="Firmware version" value={scan.firmware_version} />
        <Row label="Device hardware ID" value={scan.device_hardware_id} />
        <Row label="Server scan ID" value={scan.server_scan_id} />
        <Row label="Client scan ID" value={scan.client_scan_id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: {
    color: '#aaa',
    fontSize: 16,
  },
  networkName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111',
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  scoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: '#111',
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
});
