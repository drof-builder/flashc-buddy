# User Stories: Build Step 1 (Accounts + Decks + Cards)

Primary user: a learner (me). Each acceptance criterion should become a test.

---

## Story 1: Sign up
As a learner, I want to create an account with my email and password,
so that my decks are saved and available on any device I log in on.

**Acceptance criteria**
- The sign-up screen has email, password and confirm-password fields.
- Email must look like an email; password must be at least 8 characters.
  Invalid input shows an error next to the field and nothing is sent.
- If passwords don't match, I see "Passwords don't match."
- If the email is already registered, I see "An account with this email already exists."
- If there is no internet, I see "No connection. Try again when you're online."
- The sign-up button is disabled while the request is in progress (no double sign-ups).
- On success, I see a "Check your email" screen telling me a confirmation
  link was sent to my address.
- That screen has a "Resend email" button (disabled for 60 seconds after each send).
- Clicking the link confirms my account (it may open in the phone's browser);
  I then return to the app and log in.

> ✅ DECIDED: Users must confirm their email before using the app.

---

## Story 2: Log in
As a learner, I want to log in with my email and password,
so that I can get to my decks on this phone.

**Acceptance criteria**
- Wrong email or password shows "Incorrect email or password."
  (Never say which one was wrong; that helps attackers guess accounts.)
- If there is no internet, I see a no-connection message.
- If I haven't confirmed my email yet, I see "Please confirm your email first"
  with a "Resend email" button.
- On success, I land on my deck list and see all my decks.
- After closing and reopening the app, I am still logged in.

---

## Story 3: Log out
As a learner, I want to log out, so that someone else using my phone
can't see my decks.

**Acceptance criteria**
- A "Log out" button is on the deck list screen (v1 has no settings screen).
- Tapping it asks "Log out?" with Cancel / Log out.
- After logging out, I return to the login screen and the Back button
  does not bring me back to my decks.

---

## Story 4: Create a deck
As a learner, I want to create a deck with a name,
so that I can group cards by topic.

**Acceptance criteria**
- A "New deck" button on the deck list opens a form with a name field.
- The name can't be empty or only spaces; if it is, I see an error and nothing is saved.
- Name is at most 100 characters.
- After saving, the new deck appears in my deck list immediately.
- The deck is saved to my account and appears when I log in on another phone.

---

## Story 5: Rename a deck
As a learner, I want to rename a deck, so that I can fix typos or reorganize.

**Acceptance criteria**
- Same name rules as creating a deck.
- The new name shows in the deck list immediately and on my other devices.

---

## Story 6: Delete a deck
As a learner, I want to delete a deck I no longer need,
so that my deck list stays clean.

**Acceptance criteria**
- Deleting asks for confirmation: "Delete '<name>' and its N cards? This can't be undone."
- After confirming, the deck and ALL its cards (and their study history) are deleted.
- The deck disappears from the list immediately and from my other devices.

> ✅ DECIDED: Confirmation popup only; no Undo in v1.

---

## Story 7: Add a card
As a learner, I want to add a card with a front (question) and back (answer),
so that I can study it later.

**Acceptance criteria**
- From a deck's screen, an "Add card" button opens a form with Front and Back fields.
- Neither field can be empty or only spaces.
- Each field is at most 500 characters.
- After saving, the card appears in the deck's card list, and the deck's card count updates.
- The form offers "Save and add another" so I can add many cards quickly.

---

## Story 8: Edit a card
As a learner, I want to edit a card's front or back, so that I can fix mistakes.

**Acceptance criteria**
- Same rules as adding a card.
- Editing the text does NOT reset the card's study progress.

---

## Story 9: Delete a card
As a learner, I want to delete a card, so that wrong or useless cards don't
show up when I study.

**Acceptance criteria**
- Deleting asks for confirmation.
- After confirming, the card and its study history are removed, and the
  deck's card count updates.

---

## Applies to all stories (non-functional requirements)
- I can only ever see and change MY OWN decks and cards (enforced by the
  database, not just the app).
- Any action that needs the internet shows a clear message when offline,
  instead of failing silently or freezing.
