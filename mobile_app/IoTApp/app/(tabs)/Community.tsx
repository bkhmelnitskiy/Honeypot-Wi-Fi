import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tile = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

const TOP_TILES: Tile[] = [
  { key: 'stats',  label: 'Global stats', icon: 'stats-chart-outline', href: '/community_stats' },
  { key: 'search', label: 'Search',       icon: 'search-outline',      href: '/community_search' },
];

const BOTTOM_TILES: Tile[] = [
  { key: 'top',    label: 'Top dangerous', icon: 'warning-outline',       href: '/community_top' },
  { key: 'queue',  label: 'Upload queue',  icon: 'cloud-upload-outline',  href: '/update_queue' },
];

function SmallTile({ tile, onPress }: { tile: Tile; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.smallTile} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={tile.icon} size={28} color="#2f95dc" />
      <Text style={styles.smallTileLabel}>{tile.label}</Text>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Community</Text>

        <View style={styles.row}>
          {TOP_TILES.map((tile) => (
            <SmallTile key={tile.key} tile={tile} onPress={() => router.push(tile.href as any)} />
          ))}
        </View>

        <View style={styles.centerRow}>
          <TouchableOpacity
            style={styles.bigTile}
            activeOpacity={0.7}
            onPress={() => router.push('/account')}
          >
            <Ionicons name="person-circle-outline" size={48} color="#2f95dc" />
            <Text style={styles.bigTileLabel}>My account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {BOTTOM_TILES.map((tile) => (
            <SmallTile key={tile.key} tile={tile} onPress={() => router.push(tile.href as any)} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 24 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  centerRow: {
    alignItems: 'center',
    marginVertical: 12,
  },

  smallTile: {
    width: 130,
    height: 110,
    borderRadius: 14,
    backgroundColor: '#f0f3f7',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e3e7ec',
  },
  smallTileLabel: { fontSize: 14, color: '#222', fontWeight: '500' },

  bigTile: {
    width: 170,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#eaf4fb',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#bcdcef',
  },
  bigTileLabel: { fontSize: 16, color: '#1c6fa3', fontWeight: '600' },
});
