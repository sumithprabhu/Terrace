<p align="center">
  <img src=".github/assets/logo.png" alt="Terrace logo" width="120" />
</p>

<h1 align="center">Terrace</h1>

A peer to peer match room for football fans: predict the score, chat live, and watch a self-computed leaderboard update in real time. No server, no database, no accounts.

## Features

- **Automatic rooms**: no "Create Room" button; every match already has a room the moment the fixture exists, so there's nothing to coordinate and no risk of two people ending up in different rooms for the same match
- **Live 2026 World Cup schedule**: pulled from a free, no key needed public data feed, with an offline fallback list so the app still works with no internet access to anything but peers
- **Predictions that lock at kickoff**: submit before kickoff, automatically locked the moment it passes, computed locally from the same kickoff time on every peer
- **Live chat**: grouped messages, colored avatars, day dividers, a growing input box, reactions, replies, and @mentions
- **Crowd sourced live score**: anyone can update the current score as the match happens (Normal Time, Extra Time, Penalties); disagreements resolve by majority, or by whoever posted most recently
- **Live leading indicator**: whoever's prediction is currently closest to the live score gets a highlight next to their name in chat, well before the match is even over
- **Self-computed leaderboard**: every peer independently computes the same ranking once the match ends, and it keeps recomputing live if the score is disputed afterward
- **Real peer to peer networking**: Hyperswarm for peer discovery, Hypercore for the shared append-only log, zero central server involved in any of it

## Download

| Platform | Download |
| --- | --- |
| Windows | [Terrace-Setup-1.0.0.exe](https://github.com/sumithprabhu/Terrace/releases/download/v1.0.0/Terrace-Setup-1.0.0.exe) |
| macOS (Apple Silicon) | [Terrace-1.0.0-arm64.dmg](https://github.com/sumithprabhu/Terrace/releases/download/v1.0.0/Terrace-1.0.0-arm64.dmg) |
| macOS (Intel) | [Terrace-1.0.0.dmg](https://github.com/sumithprabhu/Terrace/releases/download/v1.0.0/Terrace-1.0.0.dmg) |
| Linux (AppImage) | [Terrace-1.0.0.AppImage](https://github.com/sumithprabhu/Terrace/releases/download/v1.0.0/Terrace-1.0.0.AppImage) |
| Linux (.deb) | [terrace_1.0.0_amd64.deb](https://github.com/sumithprabhu/Terrace/releases/download/v1.0.0/terrace_1.0.0_amd64.deb) |

Current version: **v1.0.0**. See all releases on [GitHub](https://github.com/sumithprabhu/Terrace/releases).
