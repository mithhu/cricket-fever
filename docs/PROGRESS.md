# Cricket Fever — Progress

> Manually updated when completing features. All contributors: update this file.

---

## Summary

### Project Setup
- [x] Vite + Three.js project (npm)
- [x] Code style guide (`docs/CODE_STYLE.md`) and Cursor rules
- [x] Husky hooks (pre-commit lint, post-commit progress)

### MVP (v0.1)
- [x] 3D stadium — ground, boundary circle, stands, skybox, lighting
- [x] Cricket pitch — 22-yard strip, stumps, bails, crease markings
- [x] Ball entity — physics state, visual mesh (4x scale), shadow blob
- [x] Batsman — jointed skeletal model, helmet, face, kit
- [x] Bowler — jointed skeletal model, run-up and bowling animation
- [x] AI bowler — varied line, length, speed, swing deliveries
- [x] Batting controls — W/A/S/D for shot types, SHIFT for lofted
- [x] Shot animations — distinct full-body animations (Drive, Pull, Cut, Block)
- [x] Footwork — animated step forward/back per shot type
- [x] Crease movement — arrow keys to move batsman laterally
- [x] Ball physics — parabolic trajectory, pitch bounce, ground friction/rolling
- [x] Boundary detection — 4s and 6s
- [x] Dismissals — bowled (ball hits stumps), caught (fielder physical catch)
- [x] Scoring — runs, wickets, overs, run rate, strike rate, batsman stats
- [x] Scoreboard — live overlay with all stats
- [x] Main menu — start 5 or 10 over match
- [x] Result screen — innings summary, play again, main menu
- [x] Camera — broadcast view, ball tracking after shots

### Post-MVP Features
- [x] Fielders — 9 fielders with standard positions
- [x] Fielder AI — chase ball, intercept ground shots, dive
- [x] Catching — fielders physically catch lofted balls at hand height
- [x] End Game button — end innings early
- [x] High scores — local leaderboard (top 5) using localStorage
- [x] Player profiles — create, select, delete player profiles with best scores
- [x] Player name in scoreboard — shows during match
- [x] Face orientation fixes — bowler and fielders face correct direction
- [x] Ball rolling physics — hard-hit balls roll further with gradual friction
- [x] Pause/Resume — pause button + Escape key, overlay with resume/menu options

### Mobile & Responsive
- [x] Touch controls — D-pad for movement, shot buttons (Drive/Pull/Cut/Block), lofted toggle
- [x] Auto-detect touch device — controls shown only on mobile/tablet
- [x] Responsive layout — scoreboard, menus, buttons scale for small screens
- [x] Touch-safe canvas — no zoom/scroll on game area
- [x] Mobile-friendly menu — keyboard hints swap to touch hints

### Phase 1: Polish & Game Feel (v0.2)
- [x] Sound effects — bat crack, crowd roar, wicket fall, boundary cheer, ambient, bounce (Web Audio API)
- [x] Commentary — 40+ text-based commentary lines across 9 event categories
- [x] Ball trail — 12-particle fading trail on fast deliveries
- [x] Slow-mo replay — 20% time scale on boundaries and wickets
- [x] Flying bails — bails launch with physics on bowled dismissals
- [x] Crowd animation — colored crowd figures in stands with sway
- [x] Grass variation — procedural vertex colors + mowing stripe rings
- [x] Difficulty levels — Easy/Medium/Hard selector on main menu
- [x] Mute button — toggle audio with button or M key

---

## Commit Log
