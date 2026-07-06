# Upcoming Features

Finalized list of chat features to build next, agreed on 2026 07 06. Each one
is scoped to still work with zero server involved: everything here is either
a new entry type on the same shared Hypercore log, or a purely local/visual
change.

## 1. Emoji reactions on messages

Tap a chat bubble to react with a small set of emoji (thumbs up, heart,
laugh, fire, etc). Reaction counts show under the bubble, aggregated from
everyone's reactions.

Data model: a new `reaction` entry type: `{ type: 'reaction', peerId, targetTs, emoji, ts }`,
where `targetTs` points at the `ts` of the chat message being reacted to.
One reaction per peer per message per emoji (a peer changing their reaction
replaces their earlier one, same dedupe by peer pattern already used for
predictions and the current score).

## 2. GIF / image support in chat

Paste an image or GIF URL into the chat box and it renders inline as a
preview instead of plain text. No external API needed to keep this fully
peer to peer: the message is just a normal chat entry whose text happens to
be a URL, and the renderer detects common image/GIF URL patterns and shows
an `<img>` preview under the text.

## 3. Reply / quote a specific message

Reply to an earlier message and your new message shows a small quoted
preview of the original above it, similar to WhatsApp/Slack/Discord. Keeps a
fast moving live chat readable when multiple conversations overlap.

Data model: chat entries gain an optional `replyToTs` field pointing at the
message being replied to.

## 4. @mentions, using generated human readable usernames

Tag a connected peer in chat and their message gets a highlight. The
important part: nobody should see a raw peer id like `a7b78444…` as the
"username." Instead, every peer id deterministically generates a Reddit
style readable username (for example `SwiftFalcon42`), built from a fixed
word list plus a hash of the peer id, so every app computes the exact same
name for the exact same peer with zero coordination, same as everything
else in this app.

This isn't just for mentions: it should replace the raw peer id shown
everywhere today (chat sender names, the leaderboard, the "currently
leading" marker, the peer id pill). Real, one time upgrade to the whole
app's readability.

Autocomplete for @mentions is scoped to peers currently in the room.

## 9. Typing indicators

"SwiftFalcon42 is typing…" shown live while someone is composing a message.
This is ephemeral, not something worth permanently appending to the log, so
it's sent as a lightweight live signal over the existing connection rather
than a persisted Hypercore entry, and expires automatically after a couple
of seconds of inactivity.

## 12. Celebration animation when the leaderboard reveals a winner

A short, tasteful confetti burst (or similar) the moment `matchEnded` flips
true and the leaderboard renders. Purely a client side visual moment, no
data model change.

## 13. Match themed chat background pattern

The chat panel's background gets a subtle, repeating pattern built from
exactly three elements, tiled consistently: the home team's flag, the away
team's flag, and the Terrace logo. Same layout/spacing rule every match, so
it always reads as "Terrace," just with that match's flags swapped in.

Critically: this must stay a background texture, not compete with the
chat itself. Low opacity, muted, sits behind the message bubbles without
reducing text readability or contrast. This is a "you notice it if you look"
detail, not a loud banner.

## Notes

- None of the above change how predictions, chat, current score, or the
  leaderboard replicate. Reactions, replies, and mentions are just new (or
  extended) entry types on the same shared log used today; typing indicators
  and the celebration animation are purely local/live and never touch the
  log; the username generator and the background pattern are pure functions
  of data every peer already has (peer id, and the fixture's two teams).
- Suggested build order: generated usernames first (item 4's naming part),
  since reactions/replies/mentions/typing all read better once names aren't
  raw hex. Then reactions, then replies, then mentions/typing together,
  then the two visual items (celebration animation, background pattern)
  last as polish.
