import { Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

interface Props {
  booking: Booking;
  onManage: () => void;
}

function StatusDot({ status, agentStatus }: { status: Booking['status']; agentStatus: Booking['agentStatus'] }) {
  let color: string = Colors.textMuted;
  if (status === 'confirmed') color = Colors.statusGreen;
  else if (agentStatus === 'active') color = Colors.statusAmber;

  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        marginTop: 4,
      }}
    />
  );
}

export default function BookingListItem({ booking, onManage }: Props) {
  const isPast = booking.status === 'completed' || booking.status === 'cancelled';
  const subText =
    booking.agentStatus === 'active'
      ? 'Agent still working…'
      : booking.platformBookingId
      ? `Ref: ${booking.platformBookingId}`
      : '';

  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        opacity: isPast ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FontFamily.serifMedium,
              fontSize: FontSize.lg,
              color: Colors.textPrimary,
            }}
          >
            {booking.restaurant?.name ?? 'Unknown restaurant'}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 }}>
            {booking.restaurant?.location}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: Spacing.xs }}>
            {booking.date} · {booking.time} · {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}
          </Text>
          {subText ? (
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 }}>
              {subText}
            </Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
          <StatusDot status={booking.status} agentStatus={booking.agentStatus} />
          {!isPast && (
            <Pressable onPress={onManage}>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.terracotta }}>
                Manage ›
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
