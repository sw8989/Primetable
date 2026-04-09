import "../global.css";
import { useEffect } from 'react';
import { Slot, router, useSegments } from 'expo-router';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useProfile } from '@/hooks/useProfile';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { isOnboarded, loading } = useProfile();
  const segments = useSegments();

  useEffect(() => {
    if (!fontsLoaded || loading) return;
    SplashScreen.hideAsync();

    const inOnboarding = segments[0] === '(onboarding)';

    if (!isOnboarded && !inOnboarding) {
      router.replace('/(onboarding)/name');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)/');
    }
  }, [fontsLoaded, loading, isOnboarded, segments]);

  if (!fontsLoaded || loading) return null;

  return <Slot />;
}
