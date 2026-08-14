# Together — a cozy daily companion for LDR couples 💕

> **Phase 1 + Phase 2 complete** — Auth, pairing, onboarding, dashboard + Real-time chat with stickers, GIFs, reactions, typing & seen.
>
> Live preview (dev): `npm run dev` → http://localhost:5173
> Build: `npm run build`

## Design Philosophy
Warm blush pinks, peach/sunset gradients, cream backgrounds, dusty rose accent. Rounded corners everywhere (16–24px), soft shadows, Nunito body + Fraunces headings. Ambient background shifts tone (dawn/day/dusk/night) based on both partners' local times.

Never guilt, fake urgency, anxiety streaks. Tiny rituals > grand gestures.

## Tech Stack
- Frontend: React (Vite), mobile-first, fully responsive
- Backend: Supabase (Postgres + Auth + Storage + Realtime)
- Auth: Supabase Auth email/password
- Styling: custom CSS variables, no Tailwind (to keep cute aesthetic tight)
- Deploy: Vercel (vercel.json rewrite handles SPA)

## Project Structure
```
/supabase
  schema.sql          # All tables + RLS policies + RPCs + seed questions
  RLS_TEST.md         # How to test isolation
/src
  /lib/supabase.js    # client + mock fallback for local dev without keys
  /contexts/AuthContext.jsx  # Auth + pairing + profile logic (real + mock)
  /components
    AmbientBackground.jsx  # Combined day/night gradient logic
    Layout.jsx             # Top nav + mobile bottom nav
    Confetti.jsx           # canvas-confetti wrapper
  /pages
    Landing.jsx
    Auth.jsx               # Login/Signup
    Onboarding.jsx         # 4-step: name/photo, timezone/location, dates, love languages
    Pairing.jsx            # Generate invite code/link, enter partner code, /invite/:code route
    Dashboard.jsx          # Dual timezone, countdown, days together/LDR, tiny rituals cards
    Settings.jsx           # Edit profile, unpair, privacy info
  /styles/global.css       # Design system: colors, radii, shadows, animations
```

## Phase 1 Features
### Auth & Pairing
- Email/password signup + login (Supabase Auth, or mock localStorage if no env vars)
- Each user gets unique invite code (6-char A-Z0-9, e.g. `AB3K9X`)
- Invite link: `/invite/CODE`
- Pairing via `pair_with_code()` SECURITY DEFINER RPC — validates server-side:
  - Can't pair with self
  - Code must exist, must be unpaired
  - You must be unpaired
  - Atomically creates `couples` row and sets `couple_id` on both profiles
- Unpair via `unpair_couple()` RPC — clears both profiles and deletes couple
- Mock mode: all pairing logic duplicated in localStorage so app runs without Supabase for QA

### Onboarding
- Step 1: name + optional avatar URL (photo upload via Supabase Storage bucket `avatars` ready, but URL input for now to keep simple)
- Step 2: timezone (select + auto-detected) + location
- Step 3: relationship start date + LDR start date (for counters)
- Step 4: love-language quiz (pick up to 2 from words, quality_time, acts, gifts, touch) → stored as text[]
- Sets `onboarding_completed=true`

### Dashboard
- **Dual timezone widget**: live times, date, location, sun/moon icon per hour, sync message (e.g. "You’re in sync right now!" or "Big gap — leave a note")
- **Countdown**: user-set next visit date (editable), stored on `couples.next_visit_date`, shows days/today/tomorrow + confetti on save
- **Days counters**: days together since relationship_start_date, days strong across distance since ldr_start_date (or fallback)
- **Snapshot**: placeholder cozy cards for Phase 2/3 features (Thinking of You, Daily Question, Chat, Our Story) with "coming soon" and warm micro-interactions
- **Ambient gradient**: `ambient-dawn/day/dusk/night/mixed` classes switch based on both partners' hours (updates every minute). CSS transitions 1.8s for soft shift.
- **Love languages** display, privacy badge with couple_id

### Security — RLS
All tables have RLS enabled. Key policies:
- `profiles`: SELECT `id=auth.uid()` OR `couple_id=get_my_couple_id()` OR `couple_id IS NULL` (unpaired discoverable for invite)
- `couples`: only members (user1_id or user2_id) can view/update/delete
- `messages`, `feed_posts`, `daily_answers`: `couple_id = get_my_couple_id()`
- Pairing/unpairing only via SECURITY DEFINER RPCs, never direct client writes to other profiles
- No `service_role` key in client. Only anon key + RLS.
- Timestamps `timestamptz` UTC, displayed via `Intl.DateTimeFormat` per timezone.

Test guide: `/supabase/RLS_TEST.md`

### Mobile-first
- Bottom nav (fixed), top header with avatars, sticky blur
- Cards 24px radius, buttons 999px, inputs 16px radius
- All touch targets >= 44px, animations gentle bounce/fade
- Viewport meta disables zoom, safe-area padding

## Setup

1. **Clone + install**
```bash
npm install
```

2. **Supabase project**
- Create project at supabase.com
- Run `/supabase/schema.sql` in SQL Editor
- Enable Email provider in Auth settings
- Copy URL + anon key

3. **Env**
```bash
cp .env.example .env
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

If env vars missing, app runs in **mock mode** (localStorage) so you can QA UI without backend. You’ll see pill "Mock mode — RLS simulated".

4. **Run**
```bash
npm run dev
```

5. **Deploy to Vercel**
- Connect repo, set env vars in Vercel dashboard, deploy. `vercel.json` rewrites all to `index.html`.

## Phase 2 — Chat, Stickers & GIFs (NEW ✅)
### Real-time messaging
- **Push-based, not polling**: Supabase Realtime `postgres_changes` on `messages` table + BroadcastChannel fallback for mock mode. Messages appear instantly in both tabs.
- **Schema extensible**: `sender_id`, `couple_id`, `message_type` (text/gif/sticker/system), `content`, `metadata jsonb` (stickerId, gifUrl, preview, etc.), `seen boolean`, `created_at timestamptz UTC`.
- **Persistent searchable history**: Client-side search filter + server-side `ilike` support; `gin` index on `to_tsvector` for future full-text.
- **Subtle seen indicator**: “• seen 💕” only for own messages, no aggressive counts. Auto-marks seen when partner opens chat (via `markMessagesSeen`).
- **Typing indicator**: Broadcast channel `typing` event (Supabase Realtime Broadcast, no table), 1.5s debounce, shows “typing… 💬” + dots bubble. Isolated per couple_id + excludes self.
- **Warm notifications**: Toast “New message from [partner] 💌” when document.hidden, never pushy unread badges.

### Stickers
- Custom cute pack matching aesthetic: hug 🫂, kiss 😘, miss you 🥺, goodnight 🌙, good morning ☀️, thinking of you 💭, video-call-me 📹, i'm hungry 🍜, love you 💕, proud 🥹, sleepy 😴, celebrate 🎉
- Each has gradient background, 20px radius, bounce on tap, confetti on send
- **Sticker tray**: slides up from bottom, 3-col grid, 55vh max, blur backdrop, suggestion chip at top

### Smart suggestion
- `getSmartStickerSuggestion(partnerTimezone)` checks partner's local hour: 5-11 → good morning, 11-15 → thinking of you, 22-4 → goodnight, 18-22 → miss you. Shows “✨ top” badge and explanatory text.

### GIFs
- Search via Giphy (priority) or Tenor if keys present in env (`VITE_GIPHY_API_KEY`, `VITE_TENOR_API_KEY`)
- If no keys, curated cozy mock GIFs fallback so demo still works
- Grid picker with preview, same tray UX as stickers
- GIF bubble: rounded 20px, max 220px, metadata preserved

### Quick-reaction bar
- Horizontal pill bar: ❤️ love, 😂 laugh, 🫂 hug, 😘 kiss — one-tap sends as sticker instantly
- Located above input, labeled “Quick send to [partner]”

### Message-level reactions
- Tap any bubble to show emoji picker (❤️ 😂 🫂 😘 🥺 🎉 💕)
- Stored in `message_reactions` table: `message_id`, `couple_id`, `user_id`, `emoji`, unique per user+emoji+message (toggle to remove)
- RLS: `couple_id = get_my_couple_id()`, grouped display under bubble with count badges
- Realtime: new reactions via postgres_changes + broadcast fallback

### RLS enforcement (same as Phase 1)
- `messages`: SELECT/INSERT/UPDATE/DELETE all filtered by `get_my_couple_id()`, INSERT check `sender_id=auth.uid()`
- `message_reactions`: same couple isolation + `user_id=auth.uid()` check
- Tested: one couple cannot query another’s messages/reactions even via direct API
- Migration file: `supabase/migration_phase2.sql`

### Files added
- `src/lib/chat.js` — abstraction over Supabase + mock: sendMessage, fetchMessages, subscribeToMessages, markSeen, addReaction, fetchReactions, typing broadcast, sticker pack constants
- `src/lib/giphy.js` — Giphy/Tenor search with fallback
- `src/components/chat/MessageBubble.jsx`, `StickerPicker.jsx`, `GifPicker.jsx`, `QuickReactionBar.jsx`
- `src/pages/Chat.jsx` — full page: header with partner avatar/green dot, search, toast, message list auto-scroll, typing bubble, quick bar, input with sticker/gif toggles
- Updated `src/lib/supabase.js` — mock DB now includes messages/reactions + BroadcastChannel + custom events for same-tab realtime

## Next Phases (still upcoming)
- **Phase 3**: Daily question (both answer then unlock), streaks with gentle reframing, shared feed, Thinking of You button, Sync Moment, Our Story timeline, bucket list, shared calendar
- **Phase 4**: Video calls via Daily.co / Twilio / Agora SDK
- **Phase 5**: Games (Two Truths and a Lie, Collaborative drawing, trivia, Wordle-style, This or That)

## Build Order Note
Phase 1 RLS verified. Phase 2 keeps same isolation, adds realtime, no polling, server-side validation. App remains multi-tenant, no hardcoded data. After each phase, RLS tested before moving on.

## Quick Demo Flow (mock mode or real)
1. Sign up as `alice@example.com` / `password123` → onboarding → get invite code `ABC123`
2. In incognito, sign up as `bob@example.com` → onboarding → enter `ABC123` in Pair page
3. Both land on Dashboard seeing each other's times, shared countdown, same couple_id, RLS isolated
4. Try to query other couples via API with anonymous key + JWT — blocked by RLS

## Aesthetic Details
- Colors: cream #FFF7EE, blush #FFD6D9/#FFB3BB, peach #FFDAB7, dusty rose #C86B7A, terracotta #D77A61
- Fonts: Nunito 400-800 + Fraunces
- Animations: float 3s, fadeIn 0.4s, confetti via canvas-confetti, heart-burst on pings
- Illustrations: emoji-based for Phase 1 (line-art blob illustrations planned for later)

---

Ready for your review! Ask to continue with Phase 2 (Chat, Stickers & GIFs) when you’re happy with Phase 1. 💌
