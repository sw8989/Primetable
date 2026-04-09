import { useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View } from 'react-native';
import BookingListItem from '@/components/reservations/BookingListItem';
import ManageSheet from '@/components/reservations/ManageSheet';
import { useReservations } from '@/hooks/useReservations';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

// Demo user — replace with real auth later
const DEMO_USER_ID = 1;

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontFamily: FontFamily.sansMedium,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
      }}
    >
      {text}
    </Text>
  );
}

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingTop: Spacing.xl * 2 }}>
      <Text style={{ fontFamily: FontFamily.serifMedium, fontSize: FontSize.lg, color: Colors.textPrimary }}>
        No upcoming reservations
      </Text>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.sm }}>
        Head to chat to book
      </Text>
    </View>
  );
}

export default function ReservationsScreen() {
  const { upcoming, past, loading, cancel } = useReservations(DEMO_USER_ID);
  const [managed, setManaged] = useState<Booking | null>(null);

  type ListItem =
    | { type: 'header'; text: string; key: string }
    | { type: 'booking'; booking: Booking; key: string }
    | { type: 'empty'; key: string };

  const data: ListItem[] = [];

  data.push({ type: 'header', text: 'Upcoming', key: 'h-upcoming' });
  if (upcoming.length === 0) {
    data.push({ type: 'empty', key: 'empty-upcoming' });
  } else {
    upcoming.forEach(b => data.push({ type: 'booking', booking: b, key: `booking-${b.id}` }));
  }

  if (past.length > 0) {
    data.push({ type: 'header', text: 'Past', key: 'h-past' });
    past.forEach(b => data.push({ type: 'booking', booking: b, key: `booking-past-${b.id}` }));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream }}>
      {/* Header */}
      <View
        style={{
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
          Reservations
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.key}
        refreshControl={
          <RefreshControl refreshing={loading} tintColor={Colors.terracotta} />
        }
        renderItem={({ item }) => {
          if (item.type === 'header') return <SectionLabel text={item.text} />;
          if (item.type === 'empty') return <EmptyState />;
          return (
            <BookingListItem
              booking={item.booking}
              onManage={() => setManaged(item.booking)}
            />
          );
        }}
      />

      <ManageSheet
        booking={managed}
        onClose={() => setManaged(null)}
        onCancel={cancel}
      />
    </SafeAreaView>
  );
}
