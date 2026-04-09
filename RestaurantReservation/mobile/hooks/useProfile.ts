import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem } from '@/lib/storage';
import type { UserProfile } from '@/lib/types';

const PROFILE_KEY = 'user_profile';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItem<UserProfile>(PROFILE_KEY)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = useCallback(async (data: UserProfile) => {
    await setItem(PROFILE_KEY, data);
    setProfile(data);
  }, []);

  return {
    profile,
    loading,
    isOnboarded: profile !== null,
    saveProfile,
  };
}
