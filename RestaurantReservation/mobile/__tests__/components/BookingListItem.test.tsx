import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BookingListItem from '@/components/reservations/BookingListItem';
import type { Booking } from '@/lib/types';

const base: Booking = {
  id: 1,
  userId: 1,
  restaurantId: 1,
  date: '2026-04-11',
  time: '20:00',
  partySize: 2,
  status: 'confirmed',
  agentStatus: 'success',
  platformBookingId: 'SKT-001',
  confirmed: true,
  confirmationCode: null,
  agentType: null,
  createdAt: null,
  restaurant: {
    id: 1,
    name: 'Sketch',
    description: '',
    cuisine: 'Modern European',
    location: 'Mayfair',
    imageUrl: null,
    bookingDifficulty: 'hard',
    bookingInfo: '',
    bookingPlatform: 'SevenRooms',
    bookingNotes: null,
    bookingUrl: null,
    websiteUrl: null,
  },
};

it('renders restaurant name', () => {
  render(<BookingListItem booking={base} onManage={() => {}} />);
  expect(screen.getByText('Sketch')).toBeTruthy();
});

it('shows "Agent still working…" for active agent status', () => {
  render(<BookingListItem booking={{ ...base, agentStatus: 'active', status: 'pending', platformBookingId: null }} onManage={() => {}} />);
  expect(screen.getByText('Agent still working…')).toBeTruthy();
});

it('shows booking ref when confirmed', () => {
  render(<BookingListItem booking={base} onManage={() => {}} />);
  expect(screen.getByText('Ref: SKT-001')).toBeTruthy();
});
