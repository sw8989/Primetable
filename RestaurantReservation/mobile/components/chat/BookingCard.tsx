import { Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { BookingProposal } from '@/lib/types';

interface Props {
  proposal: BookingProposal;
  onConfirm: () => void;
  onChange: () => void;
}

export default function BookingCard({ proposal, onConfirm, onChange }: Props) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        maxWidth: '85%',
        marginVertical: Spacing.xs,
        marginHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
        padding: Spacing.md,
        shadowColor: Colors.textPrimary,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Restaurant name */}
      <Text
        style={{
          fontFamily: FontFamily.serifMedium,
          fontSize: FontSize.lg,
          color: Colors.textPrimary,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {proposal.restaurantName}
      </Text>

      {/* Address */}
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          marginTop: 2,
        }}
      >
        {proposal.address} · {proposal.neighbourhood}
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm }} />

      {/* Date / time / guests */}
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.base,
          color: Colors.textPrimary,
        }}
      >
        {proposal.date} · {proposal.time}
      </Text>
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          marginTop: 2,
        }}
      >
        Table for {proposal.partySize}
      </Text>

      {/* CTAs */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
        <Pressable
          onPress={onConfirm}
          style={{
            flex: 1,
            backgroundColor: Colors.terracotta,
            borderRadius: Radius.pill,
            paddingVertical: Spacing.sm,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.white }}>
            Confirm
          </Text>
        </Pressable>
        <Pressable
          onPress={onChange}
          style={{
            flex: 1,
            borderRadius: Radius.pill,
            paddingVertical: Spacing.sm,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.divider,
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.textPrimary }}>
            Change
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
