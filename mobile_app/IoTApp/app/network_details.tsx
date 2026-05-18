import { getAttacksForScan, getItemById, type Attack } from '@/constants/db';
import { syncSingle } from '@/services/sync_engine';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#888';
  if (score >= 80) return '#2e7d32';
  if (score >= 50) return '#f57c00';
  return '#c62828';
}

function severityColor(s: Attack['severity']) {
  switch (s) {
    case 'CRITICAL': return '#7b1fa2';
    case 'HIGH':     return '#c62828';
    case 'MEDIUM':   return '#f57c00';
    default:         return '#2e7d32';
  }
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
  const scanId = id ? Number(id) : null;
  const [uploading, setUploading] = useState(false);
  const scan = scanId ? getItemById(scanId) : null;

  const attacks: Attack[] = useMemo(() => {
    return scanId ? getAttacksForScan(scanId) : [];
  }, [scanId]);

  if (!scan) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Scan not found.</Text>
      </View>
    );
  }

  async function handleUpload() {
    if (!scan || uploading) return;
    setUploading(true);
    try {
      await syncSingle(scan.client_scan_id);
      Alert.alert('Uploaded', 'Scan synced with the server.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.networkName}>{scan.network ?? '(unnamed)'}</Text>

      <View style={[styles.scoreBadge, { backgroundColor: scoreColor(scan.safety_score) }]}>
        <Text style={styles.scoreText}>
          Safety score: {scan.safety_score != null ? scan.safety_score : '—'}
        </Text>
      </View>

      {attacks.length > 0 && (
        <View style={styles.attacksSection}>
          <Text style={styles.sectionTitle}>Detected attacks ({attacks.length})</Text>
          {attacks.map((a, idx) => (
            <View key={`${a.attack_type}-${idx}`} style={styles.attackCard}>
              <View style={[styles.sevPill, { backgroundColor: severityColor(a.severity) }]}>
                <Text style={styles.sevText}>{a.severity}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attackType}>{a.attack_type.replace(/_/g, ' ')}</Text>
                <Text style={styles.attackMeta}>
                  Confidence {Math.round(a.confidence * 100)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Row label="Started at" value={scan.started_at} />
        <Row label="Completed at" value={scan.completed_at} />
        <Row label="Duration (s)" value={scan.scan_duration_sec} />
        <Row label="Firmware version" value={scan.firmware_version} />
        <Row label="Device hardware ID" value={scan.device_hardware_id} />
        <Row label="Server scan ID" value={scan.server_scan_id} />
        <Row label="Client scan ID" value={scan.client_scan_id} />
      </View>

      {!scan.server_scan_id && (
        <Pressable
          style={({ pressed }) => [styles.uploadBtn, (pressed || uploading) && { opacity: 0.85 }]}
          onPress={handleUpload}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={styles.uploadBtnText}>
            {uploading ? 'Uploading…' : 'Upload now'}
          </Text>
        </Pressable>
      )}
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

  attacksSection: { marginBottom: 16, gap: 8 },
  sectionTitle: { fontWeight: '700', color: '#222', marginBottom: 4 },
  attackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sevPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  attackType: { fontWeight: '600', color: '#111' },
  attackMeta: { color: '#666', fontSize: 12, marginTop: 2 },

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

  uploadBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#2f95dc',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  uploadBtnText: { color: '#fff', fontWeight: '600' },
});
