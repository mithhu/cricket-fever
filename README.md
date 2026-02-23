# Cricket Fever

A 3D cricket game inspired by EA Cricket 07, playable in the browser. Built with Three.js and Vite.

## Features

- **3D Stadium** — Full cricket ground with pitch, stumps, boundary, and stands
- **Batting** — 4 shot types (Drive, Pull, Cut, Block) with lofted variants
- **Bowling AI** — Varied line, length, speed, and swing deliveries
- **Fielders** — 9 fielders with chase, dive, and catch animations
- **Player Models** — Jointed skeletal models with helmet, face, and kit details
- **Shot Animations** — Distinct full-body animations per shot type with footwork
- **Scoring** — Runs, wickets, overs, run rate, strike rate tracking
- **Dismissals** — Bowled and caught (fielders must physically catch the ball)
- **Player Profiles** — Create and select player profiles with persistent high scores
- **Pause/Resume** — Pause mid-match with overlay menu
- **High Scores** — Local leaderboard with per-player tracking

## Tech Stack

- Three.js (3D rendering)
- Vite (build tool)
- Vanilla JavaScript
- HTML/CSS (UI overlays)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Controls

| Key | Action |
|-----|--------|
| W | Straight Drive |
| A | Pull Shot |
| D | Cut Shot |
| S | Block |
| SHIFT + Key | Lofted Shot |
| Arrow Keys | Move in Crease |
| Escape | Pause/Resume |

## Docs

| File | Purpose |
|------|---------|
| `docs/ROADMAP.md` | Phased plan and priorities |
| `docs/PROGRESS.md` | What's built (update when adding features) |
| `docs/CODE_STYLE.md` | Coding conventions for contributors |
