import { useAuth } from '@/hooks/use_auth';
import { getProfile, type UserProfile } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((p) => mounted && setProfile(p))
      .catch((e: any) => mounted && setError(e?.message ?? 'Offline'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  function handleLogout() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroIcon}>
        <Ionicons name="person-circle-outline" size={64} color="#2f95dc" />
      </View>
      <Text style={styles.name}>{profile?.display_name ?? user?.display_name ?? '—'}</Text>
      <Text style={styles.email}>{profile?.email ?? user?.email ?? ''}</Text>

      {loading && <ActivityIndicator style={{ marginTop: 16 }} color="#2f95dc" />}
      {error && !loading && (
        <Text style={styles.warn}>{error}. Showing cached info.</Text>
      )}

      {profile && (
        <View style={styles.card}>
          <Row label="Scans uploaded" value={String(profile.total_scans ?? 0)} />
          <Row label="Networks contributed" value={String(profile.total_networks_scanned ?? 0)} />
          <Row label="Member since" value={profile.created_at?.slice(0, 10) ?? '—'} />
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
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
  container: { padding: 24, alignItems: 'center', backgroundColor: '#f5f6f8', flexGrow: 1 },
  heroIcon: { marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700', color: '#111' },
  email: { color: '#666', marginTop: 4, marginBottom: 16 },
  warn: { color: '#f57c00', marginTop: 8, fontSize: 13 },

  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  rowLabel: { color: '#666' },
  rowValue: { color: '#111', fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#c62828',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 28,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '600' },
});
