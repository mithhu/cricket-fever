// All distances in meters, time in seconds

export const PITCH_LENGTH = 20; // ~22 yards
export const PITCH_WIDTH = 3;
export const PITCH_HALF = PITCH_LENGTH / 2;

export const GROUND_RADIUS = 70;
export const BOUNDARY_RADIUS = 65;

export const STUMP_HEIGHT = 0.72;
export const STUMP_RADIUS = 0.015;
export const STUMP_GAP = 0.115;

export const CREASE_LENGTH = 1.22;
export const POPPING_CREASE_DIST = 1.22; // from stumps

export const BALL_RADIUS = 0.036;
export const BALL_MASS = 0.156;
export const GRAVITY = -9.81;

export const BOWLER_RELEASE_HEIGHT = 2.1;
export const BOWLER_RELEASE_Z = -PITCH_HALF + 1.5;

export const BATSMAN_Z = PITCH_HALF - 1.0;
export const BATSMAN_X = 0;

// Ball speed range (m/s) — tuned for playability
export const BALL_SPEED_MIN = 12;
export const BALL_SPEED_MAX = 22;

// Shot types
export const SHOTS = {
  DRIVE: 'drive',
  PULL: 'pull',
  CUT: 'cut',
  BLOCK: 'block',
  SWEEP: 'sweep',
  LOFTED_DRIVE: 'lofted_drive',
};

// Game modes
export const GAME_MODE = {
  BAT_ONLY: 'BAT_ONLY',
  BOWL_ONLY: 'BOWL_ONLY',
  FULL_MATCH: 'FULL_MATCH',
  TWO_PLAYER: 'TWO_PLAYER',
  ONLINE: 'ONLINE',
};

// Game states
export const GAME_STATE = {
  MENU: 'MENU',
  LOBBY: 'LOBBY',           // multiplayer lobby (create/join room)
  WAITING: 'WAITING',       // waiting for bowler run-up
  AIMING: 'AIMING',         // player bowling: aiming marker on pitch
  BOWLING: 'BOWLING',       // ball in air toward batsman
  BATTING: 'BATTING',       // bat-ball contact, ball traveling after shot
  BALL_DONE: 'BALL_DONE',   // ball settled, scoring
  RESULT: 'RESULT',
  TOSS: 'TOSS',             // showing toss result
  INNINGS_BREAK: 'INNINGS_BREAK', // between innings
};

// Timing windows (seconds relative to ball arriving at batsman)
export const TIMING = {
  PERFECT_WINDOW: 0.08,
  GOOD_WINDOW: 0.16,
  EARLY_LATE_WINDOW: 0.3,
};

// Camera — behind the bowler's arm, looking toward batsman
export const CAMERA_BROADCAST_POS = { x: 0.5, y: 4, z: -PITCH_HALF - 6 };
export const CAMERA_BROADCAST_LOOK = { x: 0, y: 1, z: PITCH_HALF };
