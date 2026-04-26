# Frontend Conversation Thread Wiring — Design

## Goal

Wire the existing backend conversation thread API into the frontend so the Prime Table AI assistant remembers prior exchanges per restaurant, with a single global chat UI.

## Overview

A single `MCPXChatInterface` serves all contexts. Restaurant context (id, name) is passed silently to the agent as background metadata. Conversation history is pre-loaded from the backend on chat open, giving the agent memory without exposing thread management to the user. Two header buttons — `+ New` and `↩ Resume` — give the user explicit control.

## Architecture

### Client-side storage

`conversationId` values are persisted in `localStorage` keyed by restaurant:

```
pt_conv_{restaurantId}   — when a restaurant is active
pt_conv_global           — when no restaurant context is present
```

On chat open, the stored id (if any) is used to fetch the thread and pre-populate the message list. On first send with no stored id, a new conversation is created via `POST /api/conversations` and the returned id is written to localStorage.

### Controls (header, right side — Option A)

Two small buttons sit in the existing `MCPXChatInterface` header alongside the PT avatar:

- **`+ New`** — removes the localStorage key for the current context, clears the message list in React state, and creates a fresh thread on the next send
- **`↩ Resume`** — visible only when a stored `conversationId` exists; reloads the stored thread (auto-resume on open also follows this path)

### Data flow per send

```
localStorage[key] → conversationId (or undefined)
restaurantId (from page context) → passed as body field
messages[] (pre-loaded or accumulated in state) → passed as body field
POST /api/chat { message, messages, conversationId, restaurantId, userId }
  → response: { conversationId, ... }
  → store conversationId back to localStorage[key]
```

### Message pre-loading

On chat open (or Resume click):
1. Read `localStorage[key]` → `storedId`
2. If `storedId` exists: `GET /api/conversations/:storedId` → populate React message state
3. Pass the loaded `messages[]` in every subsequent `POST /api/chat` call so the agent has full context

### Thread creation

On first send when no `storedId`:
1. `POST /api/conversations { userId, restaurantId }` → `{ id }`
2. Store `id` in `localStorage[key]`
3. Proceed with `POST /api/chat` including the new `conversationId`

## Components affected

| File | Change |
|------|--------|
| `client/src/components/MCPXChatInterface.tsx` | Add conversationId state, pre-load logic, New/Resume buttons, pass conversationId + restaurantId to POST /api/chat |
| `client/src/hooks/useConversation.ts` (new) | Encapsulate localStorage read/write, thread fetch, new-thread creation |
| `client/src/lib/mcpxClient.ts` | Accept and forward `conversationId` and `restaurantId` in the chat request body |

## State management

React local state + custom hook (`useConversation`). No Zustand or new Context provider needed — TanStack Query handles the `GET /api/conversations/:id` fetch.

## Error handling

- If `GET /api/conversations/:id` returns 404 (stale localStorage): clear the key and start fresh silently
- If `POST /api/conversations` fails: surface a brief toast; do not send the chat message

## Out of scope

- Auth on conversation routes (pre-existing pattern; separate concern)
- Conversation history panel / full thread list (Option C — not chosen)
- Per-restaurant chat widgets (rejected in favour of single global UI)
- TOCTOU race in `appendConversationMessage` (backend concern, tracked separately)
