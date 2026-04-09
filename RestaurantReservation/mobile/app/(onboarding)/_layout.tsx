import { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import type { UserProfile } from '@/lib/types';

interface OnboardingCtx {
  draft: Partial<UserProfile>;
  update: (patch: Partial<UserProfile>) => void;
}

const OnboardingContext = createContext<OnboardingCtx>({
  draft: {},
  update: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export default function OnboardingLayout() {
  const [draft, setDraft] = useState<Partial<UserProfile>>({});

  function update(patch: Partial<UserProfile>) {
    setDraft(prev => ({ ...prev, ...patch }));
  }

  return (
    <OnboardingContext.Provider value={{ draft, update }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </OnboardingContext.Provider>
  );
}
