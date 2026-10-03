# Problem Statement: flashC-buddy v1

## Problem
Most learners study by reading over and over without testing themselves,
and they forget what they learned within days. Re-reading feels productive
but doesn't build memory; actively recalling answers, repeated at the right
intervals, does.

## Primary user
Me, as a self-learner studying from my own notes and reading material.
(Other students and learners may use it, but v1 is designed for me first.)

## v1 must do
1. Accounts: sign up / log in; my decks sync to any Android device I log in on.
2. Decks and cards: create, edit and delete decks and cards (front/back).
3. Study modes: flip card, multiple choice, type the answer.
4. Scheduling: SM-2 spaced repetition decides which cards are due each day.
5. Offline study: decks I've opened before can be studied without internet;
   results sync when I'm back online.

## Non-goals for v1 (moved to later)
- PDF import (v2)
- Practice mode, settings screen (logout lives on the deck list)
- Sharing decks, AI-generated cards
- iPhone, web version, Play Store release

## Success criteria (v1 is done when)
- I can sign up, create a deck and add 20 cards on my Android phone.
- I can study that deck with all three study modes.
- With airplane mode on, I can still study a deck I opened before.
- After going back online, my study results appear on a second device.
- Cards I got wrong come back sooner than cards I got right (SM-2 working).

## Build order
1. Accounts + decks + cards
2. Flip card + SM-2
3. Offline study
4. Multiple choice + type answer
