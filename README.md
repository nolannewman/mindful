# next-mindful (MVP)

Stack: Next.js (App Router, TS) • Tailwind • Supabase (Auth/DB/Storage) • Vercel • Calendly

## Run
1. Copy `.env.template` → `.env.local` and fill:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_CALENDLY_URL
2. `pnpm install`
3. `pnpm dev`

## Supabase
- Run `supabase/sql/schema.sql` then `seed.sql` in the SQL Editor.
- Create Storage bucket **media** (private or public read per your demo).

## Routes
- `/` Library placeholder
- `/watch/[id]` Playback (YT or signed file URL)
- `/book` Calendly embed
- `/login` Magic link (email)
- `/upload` Provider upload (basic)

