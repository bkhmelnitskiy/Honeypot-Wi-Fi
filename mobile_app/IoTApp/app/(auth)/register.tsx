import { useAuth } from '@/hooks/use_auth';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return 'At least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'At least one uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'At least one lowercase letter';
  if (!/[0-9]/.test(pwd)) return 'At least one digit';
  if (!/[^A-Za-z0-9]/.test(pwd)) return 'At least one special character';
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (busy) return;
    setError(null);
    const pwdError = validatePassword(password);
    if (!email || !displayName || pwdError) {
      setError(pwdError ?? 'All fields are required.');
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim());
      await login(email.trim(), password);
      router.replace('/scan_screen');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heroIcon}>
            <Ionicons name="person-add" size={48} color="#2f95dc" />
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join the Honeypot community.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholder="Jan Kowalski"
              placeholderTextColor="#9a9a9a"
            />
          </View>

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
              placeholder="At least 8 chars, mix of cases/digits/special"
              placeholderTextColor="#9a9a9a"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed, busy && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
          </Pressable>

          <View style={styles.bottomLink}>
            <Text style={styles.bottomLinkText}>Already have an account? </Text>
            <Link href="/(auth)/login" replace>
              <Text style={styles.bottomLinkAction}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, flexGrow: 1, justifyContent: 'center' },
  heroIcon: { alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111', textAlign: 'center' },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24 },

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
