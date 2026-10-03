# 0001: Build native Android app first with Expo

## Status
Accepted (2026-10-03)

## Context
Requirements for v1: Android only (the web app will be a separate, later
project), offline study, accounts with sync across devices, $0 budget.

I want users to open the app straight from their phone instead of going
through a browser and searching for it, which is a hassle.

Options considered:
1. PWA (web app): Most users look for apps in the Play Store, and many
   are not used to installing apps from a website. Lost for v1.
2. Kotlin: Unfamiliar to me as a beginner in native development; a new
   language, framework and tools all at once. Lost.
3. Expo (React Native): A real Android app using TypeScript/React. Chosen.

## Decision
We will build a native Android app first with Expo because:
- Users find and install apps from the Play Store, not from websites.
- Opening an app from the home screen is easier than going through a browser.
- I want to learn native app development.

## Consequences
Good:
- I get to learn native app development.
- My old flashcard app uses Expo, so I have working code to compare against.
- TypeScript/React skills carry over to my next project (the web app).
- I can test on my own Android phone with Expo Go, free, without a full build.

Trade-offs I accept:
- Debugging is harder than in a browser.
- React Native code is structured differently from plain HTML/web.
- It's my first time building and releasing a native app.
- v1 is installed directly as a free APK file. Publishing to the Play Store
  costs $25 (one-time) and waits until I can afford it.

Would revisit if:
- I'm stuck on Expo setup or build errors (not my own code) for more than 2 days.
- Offline studying turns out to be too hard to build in Expo.
- I find most of my users are on laptops, not phones.
