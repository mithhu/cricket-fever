import * as THREE from 'three';
import { GAME_MODE } from './utils/constants.js';
import { Stadium } from './scene/Stadium.js';
import { Pitch } from './scene/Pitch.js';
import { GameCamera } from './scene/Camera.js';
import { Ball } from './entities/Ball.js';
import { Batsman } from './entities/Batsman.js';
import { Bowler } from './entities/Bowler.js';
import { Fielders } from './entities/Fielders.js';
import { GameEngine } from './game/GameEngine.js';
import { Scoreboard } from './ui/Scoreboard.js';
import { MainMenu } from './ui/MainMenu.js';
import { ShotSelector } from './ui/ShotSelector.js';
import { TouchController } from './game/TouchController.js';
import { BowlingMarker } from './ui/BowlingMarker.js';
import { NetworkManager } from './network/NetworkManager.js';
import { OnlineMatch } from './network/OnlineMatch.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87ceeb, 100, 250);

const gameCamera = new GameCamera(canvas);
const stadium = new Stadium(scene);
const pitch = new Pitch(scene);
const ball = new Ball(scene);
const batsman = new Batsman(scene);
const bowler = new Bowler(scene);
const fielders = new Fielders(scene);

const scoreboard = new Scoreboard();
const mainMenu = new MainMenu();
const shotSelector = new ShotSelector();

const gameEngine = new GameEngine({
  ball,
  batsman,
  bowler,
  fielders,
  gameCamera,
  scoreboard,
  shotSelector,
  mainMenu,
  pitch,
});

const touchController = new TouchController(gameEngine.input);
gameEngine.touchController = touchController;

const bowlingMarker = new BowlingMarker(scene);
bowlingMarker.wireUI();
gameEngine.bowlingMarker = bowlingMarker;

gameEngine.highScores.renderToMenu();
mainMenu.setBestScores(gameEngine.highScores.getBestByPlayer());
mainMenu.renderCards();

mainMenu.onStart((overs, playerName, difficulty) => {
  mainMenu.hide();
  gameEngine.startMatch(overs, playerName, difficulty);
});

mainMenu.onModeStart((overs, playerName, difficulty, mode) => {
  mainMenu.hide();
  const modeMap = {
    bat_only: GAME_MODE.BAT_ONLY,
    bowl_only: GAME_MODE.BOWL_ONLY,
    full_match: GAME_MODE.FULL_MATCH,
  };
  const gameMode = modeMap[mode] || GAME_MODE.BAT_ONLY;
  if (gameMode === GAME_MODE.BAT_ONLY) {
    gameEngine.startMatch(overs, playerName, difficulty, gameMode);
  } else {
    gameEngine.startModeMatch(overs, playerName, difficulty, gameMode);
  }
});

mainMenu.on2PlayerStart((overs, player1, player2, difficulty) => {
  mainMenu.hide();
  gameEngine.startTwoPlayerMatch(overs, player1, player2, difficulty);
});

// ─── Online Multiplayer Wiring ───

const networkManager = new NetworkManager();
gameEngine.networkManager = networkManager;
const onlineMatch = new OnlineMatch(networkManager, gameEngine);

mainMenu.onOnlineCreate(async (playerName, overs) => {
  if (!networkManager.connected) {
    networkManager.connect();
    await new Promise((resolve) => {
      const check = () => {
        if (networkManager.connected) return resolve();
        setTimeout(check, 200);
      };
      check();
      setTimeout(() => resolve(), 5000);
    });
  }
  if (!networkManager.connected) {
    mainMenu.showOnlineError('Could not connect to server');
    return;
  }

  const result = await networkManager.createRoom(playerName, overs);
  if (result.error) {
    mainMenu.showOnlineError(result.error);
    return;
  }
  mainMenu.hide();
  onlineMatch.showLobby(result.code, true);
});

mainMenu.onOnlineJoin(async (playerName, code) => {
  if (!networkManager.connected) {
    networkManager.connect();
    await new Promise((resolve) => {
      const check = () => {
        if (networkManager.connected) return resolve();
        setTimeout(check, 200);
      };
      check();
      setTimeout(() => resolve(), 5000);
    });
  }
  if (!networkManager.connected) {
    mainMenu.showOnlineError('Could not connect to server');
    return;
  }

  const result = await networkManager.joinRoom(playerName, code);
  if (result.error) {
    mainMenu.showOnlineError(result.error);
    return;
  }
  mainMenu.hide();
  onlineMatch.showLobby(result.code, false);
});

document.getElementById('btn-lobby-leave').addEventListener('click', () => {
  onlineMatch.cleanup();
  document.getElementById('online-lobby').style.display = 'none';
  document.getElementById('main-menu').style.display = 'flex';
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();

function animate(currentTime) {
  requestAnimationFrame(animate);

  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  gameEngine.update(dt);
  gameCamera.update(dt);
  stadium.updateCrowd(dt);
  renderer.render(scene, gameCamera.camera);
}

requestAnimationFrame(animate);
