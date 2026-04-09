import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { useProfile } from '@/hooks/useProfile';
import { ProgressDots, ContinueButton } from './name';
import type { UserProfile } from '@/lib/types';

export default function PartySizeScreen() {
  const [count, setCount] = useState(2);
  const { draft } = useOnboarding();
  const { saveProfile } = useProfile();

  async function onFinish() {
    const profile: UserProfile = {
      name: draft.name ?? '',
      postcode: draft.postcode ?? '',
      dietary: draft.dietary ?? [],
      partySize: count,
    };
    await saveProfile(profile);
    router.replace('/(tabs)/');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={3} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
            alignSelf: 'flex-start',
          }}
        >
          Usual party size?
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xl }}>
          <Pressable
            onPress={() => setCount(c => Math.max(1, c - 1))}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: Colors.divider,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xl, color: Colors.textPrimary }}>−</Text>
          </Pressable>
          <Text style={{ fontFamily: FontFamily.serif, fontSize: 56, color: Colors.textPrimary }}>{count}</Text>
          <Pressable
            onPress={() => setCount(c => Math.min(20, c + 1))}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.terracotta,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xl, color: Colors.white }}>+</Text>
          </Pressable>
        </View>
      </View>
      <ContinueButton onPress={onFinish} label="Get Started" />
    </View>
  );
}
