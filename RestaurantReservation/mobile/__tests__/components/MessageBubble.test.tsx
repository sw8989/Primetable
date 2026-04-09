import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MessageBubble from '@/components/chat/MessageBubble';

it('renders user message right-aligned', () => {
  render(<MessageBubble role="user" content="Hello" />);
  expect(screen.getByText('Hello')).toBeTruthy();
});

it('renders assistant message', () => {
  render(<MessageBubble role="assistant" content="Good evening" />);
  expect(screen.getByText('Good evening')).toBeTruthy();
});

it('does not render system messages', () => {
  const { toJSON } = render(<MessageBubble role="system" content="System prompt" />);
  expect(toJSON()).toBeNull();
});
