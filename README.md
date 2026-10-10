# FlashC Buddy

A flashcard app for active recall and spaced repetition. Android first (Expo + Supabase).

## Docs
- Decisions: `docs/decisions/`
- Product (problem statement, user stories): `docs/product/`
- Design (data model, design doc): `docs/design/`

## Run it
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase URL, the publishable
   (anon) key and the Google web client ID.
3. `npx expo start`, then scan the QR code with **Expo Go** on your Android phone.

## Development build (needed for Google sign-in)
Google sign-in uses native code that Expo Go does not include. Install the
**development build** once (expo.dev → project → Builds → development), then run
`npx expo start` and open the project from that app instead of Expo Go.
Rebuild it (`npx eas-cli@latest build -p android --profile development`) only
when native packages change. In Expo Go the Google button is simply hidden.

## Installable APK
`npx eas-cli@latest build -p android --profile preview` → download the `.apk`
from the link and install it on the phone.

## Checks (same as CI)
- `npm test` — unit and screen tests
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
