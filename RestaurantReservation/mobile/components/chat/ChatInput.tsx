import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        backgroundColor: Colors.surface,
        gap: Spacing.sm,
      }}
    >
      {/* Mic icon (placeholder for future voice input) */}
      <Pressable>
        <Ionicons name="mic-outline" size={22} color={Colors.textMuted} />
      </Pressable>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Message Prime Table…"
        placeholderTextColor={Colors.textMuted}
        returnKeyType="send"
        onSubmitEditing={onSend}
        blurOnSubmit={false}
        editable={!disabled}
        multiline
        style={{
          flex: 1,
          fontFamily: FontFamily.sans,
          fontSize: FontSize.base,
          color: Colors.textPrimary,
          backgroundColor: Colors.cream,
          borderRadius: Radius.pill,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          maxHeight: 100,
        }}
      />
    </View>
  );
}
