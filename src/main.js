import * as THREE from 'three';
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

gameEngine.highScores.renderToMenu();
mainMenu.setBestScores(gameEngine.highScores.getBestByPlayer());
mainMenu.renderCards();

mainMenu.onStart((overs, playerName, difficulty) => {
  mainMenu.hide();
  gameEngine.startMatch(overs, playerName, difficulty);
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
