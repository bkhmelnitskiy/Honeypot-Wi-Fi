import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import '@/constants/db'; // ensures schema is initialised on app start
import { AuthProvider, useAuth } from '@/hooks/use_auth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/scan_screen');
    }
  }, [isAuthenticated, isReady, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Pair Honeypot' }} />
        <Stack.Screen name="network_details" options={{ title: 'Network Details' }} />
        <Stack.Screen name="settings_app" options={{ title: 'App settings' }} />
        <Stack.Screen name="settings_scan" options={{ title: 'Scan settings' }} />
        <Stack.Screen name="settings_device" options={{ title: 'Device settings' }} />
        <Stack.Screen name="community_stats" options={{ title: 'Global stats' }} />
        <Stack.Screen name="community_search" options={{ title: 'Search networks' }} />
        <Stack.Screen name="community_top" options={{ title: 'Top dangerous networks' }} />
        <Stack.Screen name="account" options={{ title: 'My account' }} />
      </Stack>
    </ThemeProvider>
  );
}
