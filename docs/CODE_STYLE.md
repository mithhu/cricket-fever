# Cricket Fever — Coding Style Guide

> For AI agents and developers. Follow these conventions in future work.

---

## Project Overview

- **Stack:** Three.js, Vite, Vanilla JavaScript
- **Purpose:** 3D cricket game (Cricket 07 clone) playable in the browser
- **State:** Class-based managers; no external state libraries

---

## 1. File & Folder Structure

```
src/
├── main.js               # Bootstrap: init Three.js, create entities, start loop
├── game/
│   ├── GameEngine.js     # Core game loop, state machine
│   ├── InputManager.js   # Keyboard input handling
│   ├── PhysicsEngine.js  # Ball trajectory, collision, shot velocity
│   ├── ScoreManager.js   # Runs, wickets, overs tracking
│   └── HighScoreManager.js # localStorage leaderboard
├── ai/
│   └── AIBowler.js       # AI bowling logic (line, length, speed, swing)
├── entities/
│   ├── Ball.js           # Ball mesh, physics state, shadow
│   ├── Batsman.js        # Batsman skeletal model + shot animations
│   ├── Bowler.js         # Bowler skeletal model + bowling animation
│   └── Fielders.js       # 9 fielders with chase/dive/catch AI
├── scene/
│   ├── Stadium.js        # Ground, boundary, stands, sky, lighting
│   ├── Pitch.js          # Pitch strip, stumps, crease markings
│   └── Camera.js         # Camera positions, ball tracking
├── ui/
│   ├── Scoreboard.js     # DOM scoreboard overlay
│   ├── MainMenu.js       # Start screen, player profiles
│   └── ShotSelector.js   # Shot type indicator
└── utils/
    ├── constants.js      # Dimensions, physics values, game states, shot types
    └── helpers.js        # lerp, clamp, randRange, deg/rad conversion
```

### Rules
- **One class per file.** Split when a file exceeds ~300 lines.
- **Explicit `.js` extensions** in all import paths.
- **No circular imports.**

---

## 2. JavaScript Conventions

- ES module `import`/`export` throughout
- Classes for all entities and managers
- `const` by default; `let` only for reassignment
- No `var`
- Private members prefixed with `_` (e.g., `_animState`, `_startNewBall()`)
- Arrow functions for callbacks; regular methods for class methods

---

## 3. Naming

| Type | Convention | Example |
|------|-----------|---------|
| Class | PascalCase | `GameEngine`, `AIBowler` |
| Class file | PascalCase | `GameEngine.js` |
| Utility file | camelCase | `helpers.js`, `constants.js` |
| Constant | UPPER_SNAKE | `BALL_SPEED_MIN`, `GAME_STATE` |
| Method/variable | camelCase | `startMatch`, `ballPosition` |
| Private | `_` prefix | `_updateBowling`, `_shotPlayed` |

---

## 4. Three.js Patterns

- Add meshes to `scene` in constructors
- Use `THREE.Group` hierarchies for skeletal models (joints as child groups)
- Programmatic animation via joint rotation tweening — no GLTF/FBX models
- Separate visual scale from physics radius (e.g., ball visual 4x larger)
- Shadow blobs for depth perception
- Camera tracking with lerp for smooth follow

---

## 5. Physics

- Custom physics engine (no physics library)
- Gravity constant in `constants.js`
- Ball trajectory: parabolic air + bounce deviation + ground friction
- Shot velocity calculated per shot type with explicit vx/vy/vz
- Timing quality based on ball-batsman distance at shot trigger

---

## 6. UI / Styling

- HTML/CSS overlays in `index.html`, controlled via JS (`style.display`)
- No framework; direct DOM manipulation
- Theme: dark backgrounds (`#0a1628`), gold accents (`#f0c040`), green text (`#8ab4a0`)
- All interactive elements inside `#ui-overlay`
- `pointer-events: none` on overlay, `auto` on children
- `backdrop-filter: blur()` for glass-morphism effects

---

## 7. Game State Machine

States defined in `constants.js` as `GAME_STATE`:
- `MENU` → `WAITING` → `BOWLING` → `BATTING` → `BALL_DONE` → loop or `RESULT`

All state transitions happen in `GameEngine.update(dt)`.

---

## 8. When Adding Features

1. Add constants to `src/utils/constants.js` if reusable
2. Create entity/manager class in the appropriate `src/` subfolder
3. Wire into `GameEngine` constructor and `main.js`
4. Update `docs/PROGRESS.md` and `docs/ROADMAP.md` after committing
5. Test with `npm run dev`
