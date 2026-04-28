import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AvailableNetwork = {
  id: string;
  name: string;
};

const MOCK_NETWORKS: AvailableNetwork[] = [
  { id: '1', name: 'Network 1' },
  { id: '2', name: 'Network 2' },
  { id: '3', name: 'Network 3' },
];

export default function ScanScreen() {
  const [selected, setSelected] = useState<AvailableNetwork | null>(null);
  const [scanning, setScanning] = useState(false);
  const deviceOnline = true; // TODO: wire up to real device state

  function handleScan() {
    if (!selected || scanning) return;
    setScanning(true);
    // Stubbed scan — replace with real flow.
    setTimeout(() => setScanning(false), 1500);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Top: big scan button + device status */}
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
              <Text style={styles.scanLabel}>
                {scanning ? 'Scanning…' : 'Scan'}
              </Text>
              <Text style={styles.scanEstTime}>Est. time ~5s</Text>
            </Pressable>
            <Text style={styles.selectedLabel}>
              {selected ? `Selected: ${selected.name}` : 'No network selected'}
            </Text>
          </View>

          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: deviceOnline ? '#2e7d32' : '#c62828' },
              ]}
            />
            <Text style={styles.statusText}>
              Device {deviceOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </View>

        {/* Available networks header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available networks</Text>
          <TouchableOpacity onPress={() => { /* manual input flow */ }}>
            <Text style={styles.manualLink}>Manual input »</Text>
          </TouchableOpacity>
        </View>

        {/* Network list */}
        <FlatList
          data={MOCK_NETWORKS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.networkRow, isSelected && styles.networkRowSelected]}
                onPress={() => setSelected(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="wifi"
                  size={22}
                  color={isSelected ? '#2f95dc' : '#666'}
                />
                <Text style={[styles.networkName, isSelected && styles.networkNameSelected]}>
                  {item.name}
                </Text>
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

  listContent: { paddingVertical: 4 },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  networkRowSelected: { backgroundColor: '#eaf4fb', borderRadius: 8, paddingHorizontal: 12 },
  networkName: { flex: 1, fontSize: 16, color: '#222' },
  networkNameSelected: { fontWeight: '600', color: '#1c6fa3' },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
});
