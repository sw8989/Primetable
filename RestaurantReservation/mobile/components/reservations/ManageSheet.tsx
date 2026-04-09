import { Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onCancel: (id: number) => Promise<void>;
}

export default function ManageSheet({ booking, onClose, onCancel }: Props) {
  if (!booking) return null;

  function handleCancel() {
    Alert.alert(
      'Cancel Reservation',
      `Cancel your reservation at ${booking!.restaurant?.name}?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel reservation',
          style: 'destructive',
          onPress: async () => {
            try {
              await onCancel(booking!.id);
              onClose();
            } catch {
              Alert.alert('Error', 'Could not cancel reservation. Please try again.');
            }
          },
        },
      ]
    );
  }

  function handleDirections() {
    const q = encodeURIComponent(booking!.restaurant?.name ?? '');
    Linking.openURL(`maps://?q=${q}`);
    onClose();
  }

  const actions = [
    { label: 'Get Directions', onPress: handleDirections, destructive: false },
    { label: 'Cancel Reservation', onPress: handleCancel, destructive: true },
  ];

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{
            backgroundColor: Colors.surface,
            borderTopLeftRadius: Radius.card * 2,
            borderTopRightRadius: Radius.card * 2,
            padding: Spacing.lg,
            paddingBottom: Spacing.xl,
          }}
        >
          {/* Handle bar */}
          <View style={{ width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md }} />

          <Text style={{ fontFamily: FontFamily.serifMedium, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.sm }}>
            {booking.restaurant?.name}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg }}>
            {booking.date} · {booking.time}
          </Text>

          {actions.map(action => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={{
                paddingVertical: Spacing.md,
                borderTopWidth: 1,
                borderTopColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.sans,
                  fontSize: FontSize.base,
                  color: action.destructive ? '#C0392B' : Colors.textPrimary,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
