import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/hooks/useChat';
import MessageBubble from '@/components/chat/MessageBubble';
import ToolActivity from '@/components/chat/ToolActivity';
import BookingCard from '@/components/chat/BookingCard';
import ChatInput from '@/components/chat/ChatInput';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { MCPXMessage } from '@/lib/types';

// Detect tool-activity messages: assistant messages with tool_calls but no content
function isToolActivity(msg: MCPXMessage): boolean {
  return (
    msg.role === 'assistant' &&
    (!msg.content || msg.content.trim() === '') &&
    Array.isArray(msg.tool_calls) &&
    msg.tool_calls.length > 0
  );
}

function toolActivityLabel(msg: MCPXMessage): string {
  const name = msg.tool_calls?.[0]?.function?.name ?? 'working';
  const labels: Record<string, string> = {
    search_restaurants: 'Searching restaurants…',
    check_availability: 'Checking availability…',
    book_restaurant: 'Securing your table…',
    detect_booking_platform: 'Identifying booking system…',
    web_search: 'Searching the web…',
  };
  return labels[name] ?? 'Working…';
}

export default function ChatScreen() {
  const { profile } = useProfile();
  const name = profile?.name ?? '';
  const postcode = profile?.postcode ?? '';
  const partySize = profile?.partySize ?? 2;

  const { messages, isProcessing, send, confirm } = useChat(name, postcode, partySize);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    send(text);
  }

  const visibleMessages = messages.filter(m => m.role !== 'system' && m.role !== 'tool');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: Colors.divider,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.serifMedium,
            fontSize: FontSize.lg,
            color: Colors.textPrimary,
          }}
        >
          Prime Table
        </Text>
        {/* Avatar — first initial of user's name */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: Colors.terracotta,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.white }}>
            {name.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      </View>

      {/* Message list + input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={item => item.id ?? item.content.slice(0, 20)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          renderItem={({ item }) => {
            if (isToolActivity(item)) {
              return <ToolActivity label={toolActivityLabel(item)} />;
            }
            if (item.bookingProposal) {
              return (
                <BookingCard
                  proposal={item.bookingProposal}
                  onConfirm={() => {
                    if (item.bookingProposal?.bookingId != null) {
                      confirm(item.bookingProposal.bookingId);
                    }
                  }}
                  onChange={() => send('I\'d like to change the booking')}
                />
              );
            }
            return <MessageBubble role={item.role} content={item.content} />;
          }}
          ListFooterComponent={
            isProcessing ? (
              <View style={{ marginHorizontal: Spacing.md, marginVertical: Spacing.xs }}>
                <Text
                  style={{
                    fontFamily: FontFamily.sans,
                    fontSize: FontSize.sm,
                    color: Colors.textMuted,
                    fontStyle: 'italic',
                  }}
                >
                  ···
                </Text>
              </View>
            ) : null
          }
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isProcessing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
