# RLS Testing Guide for Together — Phase 1

This doc explains how to verify that Row Level Security isolates couples.

## Schema Overview
- `profiles` has `couple_id`
- `couples` has `user1_id`, `user2_id`
- Helper `get_my_couple_id()` returns current user's couple_id.
- Pairing done via SECURITY DEFINER RPC `pair_with_code(text)` — validates invite code server-side and creates couple + updates profiles atomically.
- Unpairing via `unpair_couple()` RPC.

## Policies
### profiles
```sql
-- SELECT: own OR partner (same couple_id) OR unpaired (for invite lookup)
using (
  auth.uid() = id
  or couple_id = get_my_couple_id()
  or couple_id is null
)
-- INSERT: auth.uid()=id
-- UPDATE: auth.uid()=id
```
Unpaired visibility is intentional: you *want* to be discoverable via invite code before pairing. But once paired (couple_id not null), you are only visible to partner (same couple_id) or yourself. No other couple can read you because their get_my_couple_id() differs.

### couples
```sql
SELECT/UPDATE/DELETE using (is_couple_member(id))
-- is_couple_member checks auth.uid() in user1_id/user2_id
-- INSERT allowed if you are user1 or user2 (RPC will satisfy)
```

### messages / feed_posts / daily_answers
All filtered by `couple_id = get_my_couple_id()` — so you literally cannot query another couple's rows even if you guess UUIDs.

## Manual Test Script (run as different users)

1. **Create two users A & B and pair them, and third user C alone.**
2. **As A, try to SELECT profiles where couple_id != your couple_id and couple_id not null** — should return 0 rows (because policy only allows own couple_id OR null).
3. **As A, try to SELECT couples where id != your couple_id** — 0 rows.
4. **As C (unpaired), try to SELECT profiles of paired couples** — 0 rows, because paired profiles have couple_id not null and not equal to C's (C's couple_id is null, but policy `couple_id = get_my_couple_id()` where get_my_couple_id()=null will not match non-null couple_ids; only `couple_id is null` branch allows seeing other unpaired profiles).
5. **Try direct API call** (via curl with anon key + JWT) to bypass UI: `GET /rest/v1/profiles?select=*` — should only return own + partner + unpaired, never other couples.

### Sample curl (replace JWT)
```bash
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/profiles?select=id,display_name,couple_id" \
  -H "apikey: ANON_KEY" \
  -H "Authorization: Bearer USER_JWT"
```

### Automated test (JavaScript)
```js
// pseudo
const { data: all } = await supabase.from('profiles').select('*')
 // expect all rows to have either couple_id === myCoupleId or couple_id === null or id===myId
const violates = all.filter(r => r.couple_id !== null && r.couple_id !== myCoupleId && r.id !== myId)
console.assert(violates.length===0, 'RLS violation!', violates)
```

## What we enforce
- No client ever receives service_role key.
- All pairing logic validated inside database (invite code trimmed upper, self-pair blocked, already-paired blocked).
- Timestamps stored as timestamptz (UTC), displayed via Intl with user's timezone.

## Future Phases
When adding `messages`, `feed_posts`, etc., keep same pattern: always include `couple_id` column, index it, and policy `couple_id = get_my_couple_id()`. Never rely on UI filtering.
