# Together — a cozy daily companion for LDR couples 💕

> **Phase 1 + 2 + 3 complete** — Auth & RLS, real-time chat, daily rituals, feed, Our Story, bucket list, calendar, sync & pings.
>
> Live preview (dev): `npm run dev` → http://localhost:5173
> Build: `npm run build` • Deploy: Vercel/Netlify

Phase 1 ✅ Phase 2 ✅ Phase 3 ✅ — see below for details. Phase 4 (video) + Phase 5 (games) next.

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

## Phase 3 — Daily Rituals & Memory Bank (NEW ✅)

This phase turns ordinary moments into celebrated ones, without guilt.

### Daily Question — unlock together
- Same rotating question each day for both partners (deterministic rotation: `days since epoch % questions.length`, 20 seeded questions mix playful + meaningful).
- Tables: `daily_questions` (global) + `daily_answers` (per couple, per question, per user, unique constraint).
- Flow: If you haven't answered → textarea + save. If you have but partner hasn't → locked card showing your answer + “Waiting for partner… no peeking!” + dots. When both answered → confetti + side-by-side reveal, logged to Our Story.
- RLS: answers isolated by `couple_id = get_my_couple_id()` + `user_id = auth.uid()`.

### Streaks — gentle, never shaming
- `computeStreakFromAnswers()` groups by date where both users answered that day, computes current streak (consecutive from most recent backwards), longest streak, total days, history.
- UI: pill with 🔥 count, banner “🌱 Fresh start — new streak begins with today” if current=0, so break is reframed as “new streak started”.
- Milestones 7/30/100 days trigger confetti + special pill.

### Shared private feed — chronological photo/note feed
- `feed_posts` table already existed, now fully used: `content_type` note/photo/memory, `content_text`, `image_url`, `is_pinned` (core memory).
- Composer with type pills, textarea, image URL, posts instantly with confetti.
- Pin toggles core memory flag.
- Page `/feed` shows 100 latest, searchable via chronological order, only couple.

### Thinking of You button
- New table `pings`: `couple_id`, `sender_id`, `variant` (wave/heart/hug/kiss/sparkle), optional message, `created_at`.
- Variants with emoji, gradient, label: 👋 wave, 💖 heart-burst, 🫂 hug, 😘 kiss, ✨ sparkle.
- One-tap send, lightweight, no pressure to reply, animation + confetti, realtime via `pings` channel + BroadcastChannel fallback.
- Shown on Rituals page + dashboard.

### Sync Moment
- Table `sync_taps`: each tap has `tapped_at`, `is_synced`, `synced_with` ref.
- Logic: when user taps, look for partner's recent tap within 5 min not yet synced → if found, mark both as synced and create synced event, else record pending.
- UI: “Tap to sync 🙌” button, shows result “You synced! 💫” with confetti or “Tap recorded — if partner taps within 5 min, you’ll sync”.
- Logged to Our Story as ✨ synced moment.

### Our Story timeline — auto-generated scrollable memory lane
- Aggregation function `fetchStoryTimeline()` merges: feed posts + daily answers (only when both answered same day) + pings + synced syncs + completed bucket items.
- Sorted desc, vertical line, card per type with icon.
- Pin filter: show only core memories (is_pinned) or all.
- Users can pin favorite feed moments as core memories.

### Auto-celebration screens
- `checkMilestones()` looks at relationship start, LDR start, days together, streak.
- Milestones: 7/30/50/100/200/365/500/1000 days together, 7/30/60/100/200/365 LDR days, anniversary same month/day, streak 7/30/100.
- Shows modal with gradient card + confetti, stores last shown date in localStorage to avoid spam, gentle copy “A moment to celebrate — not just a counter”.

### Shared bucket list
- Table `bucket_list_items`: title, description, created_by, is_completed, completed_at.
- UI: add form, pending list with circle toggle, completed list with check + line-through, confetti on complete.

### Shared calendar
- Table `calendar_events`: title, event_type (visit/call/anniversary/birthday/date/custom), event_date, event_time, description.
- UI: upcoming vs past sections, emoji per type, add form with date/time, delete.

### RLS — still the whole product
- All Phase 3 tables: `pings`, `sync_taps`, `bucket_list_items`, `calendar_events`, `couple_streaks` have `couple_id = get_my_couple_id()` policies, INSERT checks user ownership.
- Mock DB extended with all new arrays + realtime via BroadcastChannel.
- Migration: `supabase/migration_phase3.sql`.

### Files added
- `src/lib/rituals.js` — full abstraction for daily Q, feed, pings, sync, bucket, calendar, timeline, milestones, mock + Supabase.
- `src/components/rituals/*`: DailyQuestionCard, ThinkingOfYou, SyncMoment, Feed (composer + post), BucketList, Calendar, OurStoryTimeline
- `src/pages/Feed.jsx` (real private feed) + `src/pages/Rituals.jsx` (daily rituals + all Phase 3 features unified)
- Updated `Layout` nav (Feed, Rituals), `Dashboard` now links to rituals, `supabase.js` mock extended.

### How to test Phase 3 (mock or real)
- Daily Question: both users open Rituals → same question → one answers → sees locked waiting, other answers → both see confetti + side-by-side.
- Streak: answer consecutive days (change system date in mock? or just see total count).
- Feed: post note/photo, pin as core memory, check timeline.
- Pings: send wave/heart, see realtime on other tab.
- Sync: both tap within 5 min → synced! logged.
- Bucket list + Calendar: add/toggle/delete.
- Our Story: shows merged timeline, pin filter.

## Next Phases (still upcoming)
- **Phase 4**: Video calls via Daily.co / Twilio / Agora SDK — Call Partner button, online status, scheduled calls, virtual date mode, history into story
- **Phase 5**: Games Together — Two Truths and a Lie, collaborative drawing, trivia, Wordle-style, This or That, Game Night quick-start

## Build Order Note
Phase 1 + 2 RLS verified. Phase 3 keeps same isolation, extends with 5 new tables all filtered by `get_my_couple_id()`. Multi-tenant from day one, no hardcoded data.

## Quick Demo Flow (mock mode or real)
1. Sign up as `alice@example.com` / `password123` → onboarding → get invite code
2. Incognito sign up as `bob@example.com` → enter code → both paired
3. Chat: realtime stickers/GIFs
4. Rituals: answer daily question together, see unlock + streak, send ping, sync tap
5. Feed: post memory, pin, see in Our Story with bucket + calendar
6. Try to query other couple's feed/answers via API — blocked by RLS

## Aesthetic Details
- Colors: cream #FFF7EE, blush #FFD6D9/#FFB3BB, peach #FFDAB7, dusty rose #C86B7A, terracotta #D77A61, plum #8E5A6B for night
- Fonts: Nunito 400-800 + Fraunces
- Animations: float, fadeIn, gentleBounce, confetti, heart-burst (1.2s), loading dots
- Rounded 16-24px, soft shadows, glass blur, mobile-first bottom nav with 5 items

---

Phase 3 complete! Ask to continue with Phase 4 (Video Calls) when ready. 💕
