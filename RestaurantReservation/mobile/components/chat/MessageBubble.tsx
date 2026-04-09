import { Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { MCPXMessage } from '@/lib/types';

interface Props {
  role: MCPXMessage['role'];
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  if (role === 'system') return null;

  const isUser = role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginVertical: Spacing.xs,
        marginHorizontal: Spacing.md,
      }}
    >
      <View
        style={{
          backgroundColor: isUser ? Colors.userBubble : Colors.aiBubble,
          borderRadius: Radius.message,
          borderBottomRightRadius: isUser ? 4 : Radius.message,
          borderBottomLeftRadius: isUser ? Radius.message : 4,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm + 2,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sans,
            fontSize: FontSize.base,
            color: isUser ? Colors.white : Colors.textPrimary,
            lineHeight: FontSize.base * 1.5,
          }}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}
