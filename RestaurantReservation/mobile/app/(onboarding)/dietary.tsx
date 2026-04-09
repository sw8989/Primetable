import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { ProgressDots, ContinueButton } from './name';

const OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free'];

export default function DietaryScreen() {
  const [selected, setSelected] = useState<string[]>(['None']);
  const { update } = useOnboarding();

  function toggle(option: string) {
    if (option === 'None') {
      setSelected(['None']);
      return;
    }
    setSelected(prev => {
      const without = prev.filter(o => o !== 'None');
      return without.includes(option)
        ? without.filter(o => o !== option)
        : [...without, option];
    });
  }

  function onContinue() {
    update({ dietary: selected.filter(o => o !== 'None') });
    router.push('/(onboarding)/party-size');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream }}>
      <ScrollView
        contentContainerStyle={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressDots total={4} current={2} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          Any dietary requirements?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {OPTIONS.map(option => {
            const active = selected.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() => toggle(option)}
                style={{
                  borderRadius: Radius.chip,
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.md,
                  backgroundColor: active ? Colors.terracotta : Colors.surface,
                  borderWidth: 1,
                  borderColor: active ? Colors.terracotta : Colors.divider,
                }}
              >
                <Text
                  style={{
                    fontFamily: FontFamily.sans,
                    fontSize: FontSize.base,
                    color: active ? Colors.white : Colors.textPrimary,
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <ContinueButton onPress={onContinue} />
    </View>
  );
}
