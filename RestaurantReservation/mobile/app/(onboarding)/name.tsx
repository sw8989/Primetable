import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';

export default function NameScreen() {
  const [value, setValue] = useState('');
  const { update } = useOnboarding();

  function onContinue() {
    if (!value.trim()) return;
    update({ name: value.trim() });
    router.push('/(onboarding)/postcode');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={0} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          What's your name?
        </Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          placeholder="First name"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
          onSubmitEditing={onContinue}
          style={{
            fontFamily: FontFamily.sans,
            fontSize: FontSize.xl,
            color: Colors.textPrimary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.divider,
            paddingVertical: Spacing.sm,
          }}
        />
      </View>
      <ContinueButton onPress={onContinue} disabled={!value.trim()} />
    </KeyboardAvoidingView>
  );
}

// ── Shared sub-components used across all onboarding screens ──────────────────

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? Colors.terracotta : Colors.divider,
          }}
        />
      ))}
    </View>
  );
}

export function ContinueButton({
  onPress,
  disabled,
  label = 'Continue',
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <View style={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? Colors.divider : Colors.terracotta,
          borderRadius: 999,
          paddingVertical: Spacing.md,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sansMedium,
            fontSize: FontSize.base,
            color: Colors.white,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
