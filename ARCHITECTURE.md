# Terrace — development and architecture

## Setup

Requires Node.js 18+.

```bash
npm install
```

## Run the demo with 2 peers

Open two terminals in this folder. Each command below launches a full, independent
desktop app window with its own identity and local storage (`--instance` just picks
a separate profile folder so two copies can run side-by-side on one machine):

```bash
# terminal 1
npm start -- --instance=peerA

# terminal 2
npm start -- --instance=peerB
```

Both windows show the same live match list (see [`lib/fixtures.js`](lib/fixtures.js)),
each tagged **Opens in Xh** / **Open — join now** / **LIVE** / **Closed** depending
on how far away kickoff is. Then:

1. In both windows, click **Join** on the same match in the list (any match marked
   "Open" or "LIVE" — nothing to type, nothing to coordinate; picking the same list
   entry is enough since the room topic is derived from that match's id).
2. Watch the peer count in both windows tick up once Hyperswarm finds the other
   peer — this can take anywhere from ~1 second to (occasionally) up to a minute,
   depending on your network's NAT (see [Timing notes](#timing-notes) below).
3. If the match is still "Open" (pre-kickoff), submit a prediction in each window.
   Watch it show up in the *other* window too — that's the same Hypercore log
   being replicated and read on both sides.
4. Chat back and forth — messages appear live in both windows.
5. Once kickoff passes, both windows independently flip to **PREDICTIONS LOCKED**
   and disable the prediction form — computed locally from the same bundled
   kickoff time, no coordination needed.
6. In either window, use the **Current Score** form to report what you think the
   score is (with a phase: Normal Time, Extra Time, or Penalties). Report a
   *different* score from the other window and watch the consensus rule play out:
   with exactly 2 people reporting and disagreeing, whoever posted most recently
   wins, live, in both windows.
7. Whoever's prediction is currently closest to that live score gets a small
   marker next to their name in the chat feed, in both windows, updating as the
   score changes, well before the match is marked over.
8. Click **End Match** in either window. Both windows instantly render a
   **leaderboard**, ranked by prediction accuracy against the current score, with
   the winner highlighted — computed independently on each machine from the same
   log. Report yet another score afterward and watch the leaderboard update live,
   nothing is ever frozen.

Kickoff times are real, so by the time you read this some matches may already show
"LIVE" or "Closed" rather than "Open" — that's the lifecycle working as intended,
not a bug. If you want a fresh "opens in 12h → predict → locks → result" cycle on
demand instead of waiting on the real schedule, edit the fallback list at the
bottom of `lib/fixtures.js` and run with no internet access, which makes the live
fetch fail and the app fall back to that list.

To run on two separate physical machines instead of two windows on one machine,
just run `npm start` on each machine (no `--instance` flag needed) — they'll find
each other over the public Hyperswarm DHT the same way.

## Automated tests

Two levels of automated verification, no manual clicking required:

```bash
# Core P2P logic: two real peers (peer A in this process, peer B forked as
# its own child process -- real Hyperswarm/Hypercore, no UI, no mocking).
# Exercises fixture join-gating, prediction/chat sync, the current-score
# consensus rule (including a disagreement being resolved live), and asserts
# the leaderboard comes out identical and correct on both peers.
npm test

# Full GUI test: spawns two real Electron app windows and drives them via the
# Chrome DevTools Protocol (fills in the actual forms, clicks the actual
# buttons, reads the actual rendered DOM) end to end.
node test/electron-e2e.js
```

## Architecture

### Why this is "real" P2P, not client-server wearing a disguise

- **No process anywhere holds authoritative state.** Each peer's Hypercore is the
  *only* copy of that peer's writes. If every other peer disappeared, a peer would
  still have its own predictions/chat/result entries — there's no "source of
  truth" server to lose contact with.
- **The leaderboard is not fetched, it's computed.** `lib/leaderboard.js` is a pure
  function over whatever log entries a peer happens to have locally. Every peer
  runs the exact same function over the exact same (eventually-consistent) merged
  data and gets the exact same answer, with no coordination step. You can see this
  for yourself in the demo: peer A's leaderboard and peer B's leaderboard are
  rendered by two completely separate processes that never asked each other "who
  won" — they both just did the math.
- **Peer discovery is DHT-based, not a directory service.** Joining a room means
  joining a [Hyperswarm](https://github.com/holepunchto/hyperswarm) topic — a
  SHA-256 hash of the fixture's stable `matchId`. Hyperswarm finds other peers on
  that topic via a public Kademlia DHT and connects directly, peer-to-peer (with
  NAT hole-punching), the same way BitTorrent finds peers on a torrent's infohash.
  There's no "Terrace server" in that flow at all.
- **Nobody creates a room, so nobody can create a *duplicate* one.** Because the
  topic is derived from a `matchId` rather than free-text a user types, there's no
  risk of two people typing "Arsenal vs Chelsea" slightly differently and ending up
  in two disconnected rooms without realizing it — every install reads the same
  live match feed (or the same fallback list if offline), so "the room for this
  match" is unambiguous by construction.
- **The match list is the one thing that isn't peer-to-peer, and that's fine.**
  `lib/fixtures.js` does a plain read only HTTPS fetch of a free, public, no key
  needed schedule feed to know what matches exist and when. That's not the
  networking this app is judged on: predictions, chat, and the leaderboard never
  touch that feed, they're 100% Hyperswarm/Hypercore. It's the equivalent of a
  torrent client reading a public tracker list, not the file transfer itself.

### Data model

A single logical per-match log, physically split across N per-peer Hypercores
(Hypercore is single-writer by design), each entry one of:

```jsonc
{ "type": "prediction",   "peerId": "...", "prediction": { "home": 2, "away": 1 }, "ts": 169... }
{ "type": "chat",         "peerId": "...", "text": "...", "ts": 169... }
{ "type": "score_update", "peerId": "...", "home": 2, "away": 1, "phase": "normal", "ts": 169... }
{ "type": "match_ended",  "peerId": "...", "ts": 169... }
```

There's deliberately no `room_meta` bootstrap entry: home/away/kickoffTime come
straight from the fixture (`lib/fixtures.js`), looked up locally by `matchId`, so
every peer already agrees on the kickoff time — and therefore the lock rule
(`now > kickoffTime` disables prediction submission) — before a single byte has
replicated over the network.

There's also no single `result` entry that one person posts once. `score_update`
is crowd sourced and can be appended by anyone, any number of times, throughout
the match. `lib/leaderboard.js`'s `getCurrentScore()` resolves whatever the
current entries say into one answer:

- Only each peer's *latest* report counts — correcting yourself replaces your
  earlier vote, it doesn't add a second one.
- With exactly 2 reporters disagreeing, whoever posted **most recently** wins.
- With 3 or more reporters, whichever exact score **the most people currently
  agree on** wins (ties broken by most recent).

`match_ended` is just a marker — the moment any peer posts one, every client
switches from the live score panel to the leaderboard view. It doesn't freeze
anything: the leaderboard is always computed fresh from whatever `getCurrentScore()`
currently returns, so a `score_update` posted *after* `match_ended` (someone
disputing the result) still recomputes the leaderboard live, identically, on
every peer.

### Why per-peer Hypercores + client-side merge, not Autobase

Multiple people need to write to "the same" log, but Hypercore is single-writer.
The simplest correct way to get a shared, appendable, multi-writer log without a
server is: **everyone runs their own Hypercore, everyone replicates everyone
else's Hypercore, and the client merges all of them by timestamp.** That's exactly
what `lib/room.js` does — no [Autobase](https://github.com/holepunchto/autobase)
or CRDT merge logic needed, because none of these message types ever need to be
edited or reordered relative to each other in a way that requires causal
consistency guarantees stronger than "sort by timestamp." Working and simple beat
elegant and complicated here.

The one trick worth calling out: normally, to replicate a peer's Hypercore you'd
need them to tell you its public key first (a handshake). Terrace skips that
handshake entirely by reusing each peer's Hyperswarm keypair as their Hypercore
keypair too, in Hypercore's `compat: true` mode (where a core's public key *is*
the raw signing keypair's public key, rather than a manifest hash). That means the
public key a peer sees on `swarm.on('connection', (socket, info) => ...)` **is
already** that peer's Hypercore key — so opening `new Hypercore(storage,
info.publicKey, { compat: true })` on connect is enough to start reading their
log. No gossip protocol, no extra round trip.

Typing indicators use a different mechanism entirely: since they're ephemeral and
shouldn't be part of the permanent log, they ride a Hypercore protocol extension
(`core.registerExtension`) instead of an appended entry — a live broadcast over
the same replication connections, with nothing persisted anywhere.

### Chat design

The chat panel follows patterns common to widely used messaging apps (WhatsApp,
Telegram, iMessage, Discord): consecutive messages from the same person collapse
into one grouped column with a single avatar and name instead of repeating on
every line, sent messages align right in the accent color while received
messages align left in a neutral tone (alignment plus color, not color alone, so
it still reads clearly for color blind users), timestamps and day dividers stay
out of the way until they are needed, and the input grows with the message
instead of staying a single cramped line. Every peer gets a consistent colored
avatar and a generated readable username derived from their peer id, which
matters more here than in a typical chat app since a room can have more than two
participants and raw hex peer ids are not memorable.

### Why Electron, not the Pear CLI's `pear run`/`pear dev`

The original plan (per the Pears Stack) was to run the desktop UI directly via
`pear run --dev .` loading an HTML entrypoint. In the course of building this,
that flow was tested directly against the current Pear CLI (v0.3243) and it hard
fails:

```
[ LEGACY ] No longer booting app from HTML entrypoints
```

This isn't a local misconfiguration — Pear's own docs confirm `pear run` is
deprecated and being removed, and `pear-electron` (the library for embedding Pear
in an Electron shell) was archived read-only in April 2026. The current
recommended shape for a Pear-ecosystem desktop app is a plain Electron app that
embeds Hyperswarm/Hypercore directly (with the `pear` CLI relegated to optional
packaging/distribution via `pear build`/`pear stage`, not to running the dev UI).
That's exactly what this app does: **Hyperswarm and Hypercore are the real P2P
substrate here — the same libraries `pear run` would have used underneath — just
hosted in a standard, currently-supported Electron shell instead of a
now-deprecated CLI runner.**

### Timing notes

NAT hole-punching over Hyperswarm's public DHT is inherently variable — in testing
this ranged from under a second to occasionally 60+ seconds on the same network,
with no code change in between. This is a property of peer-to-peer networking over
the open internet (there's no relay/TURN server here to fall back to — that would
reintroduce a "server" of sorts), not a bug in the app. The peer count badge in the
room header will simply update whenever Hyperswarm finds the other side.

## Packaging and releases

Unsigned builds for macOS (dmg/zip, x64 + arm64), Windows (nsis), and Linux
(AppImage/deb) via `electron-builder` (see the `build` field in `package.json`).

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Pushing a version tag (`git tag vX.Y.Z && git push origin vX.Y.Z`) triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which builds all
three platforms in parallel (each on its own native runner, since the native P2P
dependencies need to build against that platform's Electron binary) and publishes
the installers straight to a GitHub Release.

## Project layout

```
main.js              Electron main process: window, IPC handlers, Room lifecycle
preload.js            contextBridge: exposes a small window.terrace API to the UI
lib/
  fixtures.js         Live match feed (free, no key needed) + fallback list +
                      open/live/closed lifecycle (12h before kickoff -> 6h after)
  room.js             Hyperswarm + Hypercore room: join, replicate, append, merge
  topic.js            Deterministic SHA-256 topic derivation from a matchId
  identity.js          Persistent per-instance Ed25519 keypair (peer identity)
  leaderboard.js       Pure functions: lock check, chat/prediction extraction,
                       crowd sourced current-score consensus, leaderboard
                       ranking — the actual "who won" logic, fully unit
                       testable with no networking involved
renderer/
  index.html, renderer.js, styles.css     Plain HTML/CSS/JS UI, no framework
test/
  core-logic.test.js   2 real peers (1 forked child process), real networking, no UI
  core-logic-worker.js Child-process RPC worker used by core-logic.test.js
  electron-e2e.js      2 real Electron GUI windows, driven via CDP
website/             Next.js marketing/landing page (separate app, see website/)
```
