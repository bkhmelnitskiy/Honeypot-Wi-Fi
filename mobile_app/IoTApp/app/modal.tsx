import { honeypot, type DiscoveredDevice } from '@/services/honeypot';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Step = 'discover' | 'enter-code' | 'pairing';

export default function PairHoneypotModal() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('discover');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [pairing, setPairing] = useState(false);

  async function refreshScan() {
    setScanning(true);
    try {
      const list = await honeypot.discover();
      setDevices(list);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Unknown error');
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => { refreshScan(); }, []);

  async function handlePair() {
    if (!selected || code.length !== 6) return;
    setPairing(true);
    setStep('pairing');
    try {
      await honeypot.pair(selected.id, code);
      router.back();
    } catch (e: any) {
      Alert.alert('Pairing failed', e?.message ?? 'Invalid code');
      setStep('enter-code');
    } finally {
      setPairing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bluetooth" size={28} color="#2f95dc" />
        <Text style={styles.title}>Pair Honeypot</Text>
        <Text style={styles.subtitle}>
          {step === 'discover' && 'Select a nearby device to begin pairing.'}
          {step === 'enter-code' && 'Enter the 6-digit code shown on the device.'}
          {step === 'pairing' && 'Establishing secure connection...'}
        </Text>
      </View>

      {step === 'discover' && (
        <View style={styles.body}>
          {scanning && (
            <View style={styles.scanRow}>
              <ActivityIndicator size="small" color="#2f95dc" />
              <Text style={styles.scanText}>Scanning for devices...</Text>
            </View>
          )}
          {devices.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.deviceRow}
              activeOpacity={0.7}
              onPress={() => { setSelected(d); setStep('enter-code'); }}
            >
              <Ionicons name="hardware-chip-outline" size={22} color="#2f95dc" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{d.name}</Text>
                <Text style={styles.deviceMeta}>{d.id} · {d.rssi} dBm</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </TouchableOpacity>
          ))}
          {!scanning && devices.length === 0 && (
            <Text style={styles.empty}>No devices found.</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
            onPress={refreshScan}
            disabled={scanning}
          >
            <Ionicons name="refresh" size={16} color="#2f95dc" />
            <Text style={styles.secondaryBtnText}>Scan again</Text>
          </Pressable>
        </View>
      )}

      {step === 'enter-code' && (
        <View style={styles.body}>
          {selected && (
            <Text style={styles.selectedText}>
              Pairing with <Text style={{ fontWeight: '700' }}>{selected.name}</Text>
            </Text>
          )}
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#bbb"
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || pairing) && { opacity: 0.85 },
              code.length !== 6 && styles.btnDisabled,
            ]}
            onPress={handlePair}
            disabled={code.length !== 6 || pairing}
          >
            <Text style={styles.primaryBtnText}>Pair</Text>
          </Pressable>
        </View>
      )}

      {step === 'pairing' && (
        <View style={[styles.body, { alignItems: 'center', paddingTop: 32 }]}>
          <ActivityIndicator size="large" color="#2f95dc" />
          <Text style={styles.scanText}>Connecting...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 8 },
  subtitle: { color: '#666', textAlign: 'center', marginTop: 8, fontSize: 13 },
  body: { gap: 10 },

  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scanText: { color: '#666' },

  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f6f8fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e6e9ed',
  },
  deviceName: { fontWeight: '600', color: '#111' },
  deviceMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  empty: { color: '#888', textAlign: 'center', marginVertical: 16 },

  selectedText: { color: '#444', marginBottom: 8 },
  codeInput: {
    borderWidth: 2,
    borderColor: '#dcdee2',
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: '#111',
    backgroundColor: '#fafbfc',
  },

  primaryBtn: {
    backgroundColor: '#2f95dc',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnDisabled: { backgroundColor: '#9ec9e2' },

  secondaryBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf4fb',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  secondaryBtnText: { color: '#2f95dc', fontWeight: '600' },
});
