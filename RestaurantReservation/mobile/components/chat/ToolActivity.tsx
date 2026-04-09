import { Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

interface Props {
  label: string;
}

// Muted italic line shown when the AI is calling a tool
export default function ToolActivity({ label }: Props) {
  return (
    <View style={{ marginHorizontal: Spacing.md, marginVertical: Spacing.xs }}>
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          fontStyle: 'italic',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
