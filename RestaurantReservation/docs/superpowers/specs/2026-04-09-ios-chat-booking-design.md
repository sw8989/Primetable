# Prime Table — iOS App Design Spec
**Date:** 2026-04-09
**Scope:** iOS app frontend — chat-first booking experience

---

## Overview

Prime Table is an AI-powered concierge app that secures reservations at London's most exclusive restaurants. The iOS app is the primary product and acquisition channel (App Store distribution). The AI agent — running on the existing Node.js/Express backend with LLM and scraping tools — does all the heavy lifting. The app is a clean, premium client.

The core experience: users talk to a concierge in a chat interface. The agent finds and books the table. Users track reservations in a minimal reservations screen.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo) |
| Backend | Existing Node.js/Express (unchanged) |
| Shared types | `shared/schema.ts` — ported as-is |
| Navigation | Expo Router (file-based, tab navigation) |
| Styling | NativeWind (Tailwind for React Native) |

The backend scraping, LLM calls, and MCP tools stay server-side. The app consumes the existing `/api/*` endpoints.

---

## App Structure

```
Launch
  └── First launch → Onboarding (4 screens)
  └── Returning    → Chat (direct)

Bottom Tab Bar (2 tabs):
  ├── Chat          (speech bubble icon — default tab)
  └── Reservations  (calendar icon)
```

No home screen. No restaurant grid. The chat is the primary surface.

---

## Onboarding

4 full-screen slides, swipe or "Continue" to advance. No skip. Completes in ~30 seconds. Data stored in user profile, sent to backend on completion.

| Screen | Question | Input type |
|---|---|---|
| 1 | "What's your name?" | Text field, first name only |
| 2 | "Where are you based?" | Postcode field, auto-formats (e.g. `EC2A`) |
| 3 | "Any dietary requirements?" | Multi-select chips: None, Vegetarian, Vegan, Halal, Kosher, Gluten-free |
| 4 | "Usual party size?" | Stepper, 1–10+ |

**Design:** Cream background, large Canela question text (32pt), single input centred on screen, terracotta "Continue" button at the bottom. Progress dots beneath the question.

The postcode feeds into the AI's context immediately — from message one, the agent knows the user's neighbourhood without them having to specify it.

---

## Visual Design System

### Colour Palette

```
Background:   #F7F4EF  — warm cream (default screen background)
Surface:      #FFFFFF  — cards, modals, bottom sheets
Text primary: #1A1714  — near-black, warm undertone
Text muted:   #6B6560  — secondary info, timestamps
Accent:       #9B3B1F  — terracotta (brand primary, CTAs, user bubbles)
AI bubble:    #EDEAE4  — slightly darker cream
User bubble:  #9B3B1F  — terracotta with white text
Divider:      #E8E4DE
Status green: #2D7A4F  — confirmed bookings
Status amber: #B87B2A  — pending / agent working
```

### Typography

```
Display / restaurant names:  Canela Deck (editorial serif) — fallback: Georgia or system serif
UI / body / chat:            Inter — fallback: SF Pro (iOS system font)
Onboarding questions:        Canela, 32pt, regular
Message text:                Inter, 15pt
Timestamps / meta:           Inter, 11pt, Text muted
Restaurant name in cards:    Canela, 18pt, medium
```

### Spacing & Radius

```
Base grid:      8pt
Card radius:    12px
Message radius: 18px
Input bar:      pill (radius 999)
```

### Motion

Subtle and deliberate — no bouncy physics. Messages slide up on send. Booking cards expand inline. Calm, not playful.

---

## Chat Screen

### Layout

```
┌─────────────────────────────┐
│  Prime Table        [avatar]│  ← wordmark left, profile avatar right
├─────────────────────────────┤
│                             │
│  ┌──────────────────┐       │
│  │ Good evening,    │       │  AI bubble — cream, Canela name
│  │ Stanislas.       │       │
│  │ Where would you  │       │
│  │ like to dine?    │       │
│  └──────────────────┘       │
│                             │
│          ┌────────────────┐ │
│          │ Sketch, Friday │ │  User bubble — terracotta
│          │ night for 2    │ │
│          └────────────────┘ │
│                             │
│  ┌──────────────────────┐   │
│  │ Checking Sketch…     │   │  Tool activity — muted italic
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │  Booking card bubble
│  │ SKETCH               │   │
│  │ 9 Conduit St · Mayfair│  │
│  │ Fri 11 Apr · 8:00pm  │   │
│  │ Table for 2          │   │
│  │ ──────────────────   │   │
│  │ [Confirm]  [Change]  │   │
│  └──────────────────────┘   │
│                             │
├─────────────────────────────┤
│ ○  Message Prime Table...   │  ← pill input, mic icon left
└─────────────────────────────┘
```

### Message Types

| Type | Style |
|---|---|
| AI text | Left-aligned, `#EDEAE4` bubble, Inter 15pt |
| User text | Right-aligned, `#9B3B1F` bubble, white Inter 15pt |
| Tool activity | Left-aligned, no bubble, muted italic Inter 13pt ("Checking Sketch…") |
| Booking card | Left-aligned, white surface card, restaurant name in Canela serif, two CTAs |
| Typing indicator | Three dots, cream bubble, same position as AI messages |

### Booking Card

Surfaces inline in the chat when the agent has found a slot. Contains:
- Restaurant name (Canela, all caps, 14pt)
- Address · Neighbourhood
- Date · Time
- Party size
- Divider
- Two buttons: **Confirm** (terracotta filled) · **Change** (ghost/outline)

No restaurant images in the card — text only, clean.

### Input Bar

Pill-shaped, cream background, placeholder "Message Prime Table…". Mic icon on the left (future voice input). Return key sends — no visible send button.

---

## Reservations Screen

### Layout

```
┌─────────────────────────────┐
│  Reservations               │
├─────────────────────────────┤
│  UPCOMING                   │  ← small caps label, muted
│                             │
│  ┌─────────────────────────┐│
│  │ Sketch              ●   ││  ● green = confirmed
│  │ Mayfair                 ││
│  │ Fri 11 Apr · 8:00pm · 2 ││
│  │ Ref: SKT-2847           ││
│  │              [Manage ›] ││
│  └─────────────────────────┘│
│                             │
│  ┌─────────────────────────┐│
│  │ Core by Clare Smyth  ◌  ││  ◌ amber = pending
│  │ Notting Hill            ││
│  │ Sat 19 Apr · 7:30pm · 4 ││
│  │ Agent still working...  ││
│  └─────────────────────────┘│
│                             │
│  PAST                       │
│                             │
│  ┌─────────────────────────┐│
│  │ Brat                 ✓  ││  ✓ muted grey = completed
│  │ Shoreditch              ││
│  │ Sat 22 Mar · 7:00pm · 2 ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### Booking Card States

| Status | Indicator | Sub-text |
|---|---|---|
| Confirmed | Green dot | Booking ref |
| Pending / agent working | Amber dot | "Agent still working…" |
| Completed (past) | Muted grey tick | No sub-text |
| Cancelled | — | Hidden from upcoming, shown in past as struck |

### Manage Bottom Sheet

Tap "Manage ›" to open a bottom sheet with:
- Add to Calendar
- Get Directions
- Cancel Reservation (destructive, red text)

### Empty State

"No upcoming reservations. Head to chat to book." with a text link back to the Chat tab. No illustration.

---

## API Integration

The Expo app talks to the existing Express backend. No new endpoints required for the initial build — reuses:

- `GET /api/restaurants` — restaurant catalogue
- `POST /api/bookings` — create booking
- `GET /api/bookings?userId=:id` — user's bookings
- `DELETE /api/bookings/:id` — cancel booking
- `POST /api/chat` (or equivalent MCP endpoint) — AI chat messages

User profile (name, postcode, dietary prefs, party size) stored locally on device (AsyncStorage) and synced to backend on first launch.

---

## Out of Scope (this spec)

- Push notifications (post-MVP)
- WhatsApp confirmation messages (post-MVP)
- Voice input via mic button (post-MVP)
- Restaurant discovery / browse grid
- User authentication (demo user in initial build)
- Payment / deposit handling
