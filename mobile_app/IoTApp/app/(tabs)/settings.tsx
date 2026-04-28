import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SettingTile = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TILES: SettingTile[] = [
  {
    key: 'app',
    title: 'App settings',
    subtitle: 'Theme, notifications, language',
    icon: 'phone-portrait-outline',
  },
  {
    key: 'scan',
    title: 'Scan settings',
    subtitle: 'Default duration, attack types',
    icon: 'scan-outline',
  },
  {
    key: 'device',
    title: 'Device settings',
    subtitle: 'Pairing, firmware, diagnostics',
    icon: 'hardware-chip-outline',
  },
];

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Settings</Text>

        <View style={styles.list}>
          {TILES.map((tile) => (
            <TouchableOpacity key={tile.key} style={styles.tile} activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                <Ionicons name={tile.icon} size={26} color="#2f95dc" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9a9a9a" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },

  list: { gap: 14 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f6f8fa',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e6e9ed',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eaf4fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTitle: { fontSize: 16, color: '#111', fontWeight: '600' },
  tileSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
});
