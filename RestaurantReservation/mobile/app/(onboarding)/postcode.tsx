import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { ProgressDots, ContinueButton } from './name';

export default function PostcodeScreen() {
  const [value, setValue] = useState('');
  const { update } = useOnboarding();

  function formatPostcode(raw: string) {
    return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8);
  }

  function onContinue() {
    if (!value.trim()) return;
    update({ postcode: value.trim() });
    router.push('/(onboarding)/dietary');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={1} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          Where are you based?
        </Text>
        <TextInput
          autoFocus
          autoCapitalize="characters"
          value={value}
          onChangeText={v => setValue(formatPostcode(v))}
          placeholder="Postcode e.g. EC2A"
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
