# FlashC Buddy

A flashcard app for active recall and spaced repetition. Android first (Expo + Supabase).

## Docs
- Decisions: `docs/decisions/`
- Product (problem statement, user stories): `docs/product/`
- Design (data model, design doc): `docs/design/`

## Run it
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
3. `npx expo start`, then scan the QR code with **Expo Go** on your Android phone.

## Checks (same as CI)
- `npm test` — unit and screen tests
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
