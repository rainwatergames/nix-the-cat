# Nix the Cat — v1.0.0

A mobile web rhythm game starring Nix the cat. Swat snacks on the beat across 13 original songs: lo-fi, funk, EDM, drum & bass, punk, salsa, synthwave, arcade rock, reggae, K-pop, Nordic war drums, synthwave pop-punk and gothic nu-metal. It has a Career mode (alley busker → stadium headliner), Free Play, Easy/Normal/Hard difficulties, fever mode, meow call-and-response, unlockable outfits and high scores.

**Play:** https://rainwatergames.github.io/nix-the-cat/

All music is original. It was composed for this game.

© 2026 Rainwater Games (Jeff Rainwater). All rights reserved.

## Test URLs (append to the game URL)
| Hook | What it does |
|---|---|
| `?song=<id>&diff=easy\|normal\|hard` | Jump straight into a song (tap to start). IDs: lofi, funk, hype, dnb, punk, salsa, vr, pinball, reggae, kpop, viking, summer, goth |
| `&bot` / `&bot=NN&jit=MS` | Autoplay; `bot=NN` hits about NN% of notes, `jit` adds timing jitter in ms |
| `?test=career` | Career map with every venue open and demo stars (not saved) |
| `?test=careerfresh` | Career map as a brand-new player would see it (not saved) |
| `?test=careerresult` | Results screen for a career gig that opens a new venue |
| `?gig=C-J` | Play career gig J of chapter C (both 0-based), not saved |
| `?test=results` / `wardrobe` / `highscores` / `fever` / `tutorial` / `callresponse` | Jump to that screen/state (combine `fever` with `&song=`) |
| `?unlock=all` | Try on every outfit (not saved) |

