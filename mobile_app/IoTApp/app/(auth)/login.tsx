import { useAuth } from '@/hooks/use_auth';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (busy) return;
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace('/scan_screen');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={56} color="#2f95dc" />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to sync your scans with the community.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#9a9a9a"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9a9a9a"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed, busy && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.bottomLink}>
            <Text style={styles.bottomLinkText}>No account yet? </Text>
            <Link href="/(auth)/register" replace>
              <Text style={styles.bottomLinkAction}>Create one</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  heroIcon: { alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', textAlign: 'center' },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 32 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, color: '#444', marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#dcdee2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafbfc',
  },

  error: { color: '#c62828', fontSize: 13, marginTop: 4, marginBottom: 8 },

  primaryBtn: {
    backgroundColor: '#2f95dc',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  bottomLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  bottomLinkText: { color: '#666', fontSize: 14 },
  bottomLinkAction: { color: '#2f95dc', fontSize: 14, fontWeight: '600' },
});
