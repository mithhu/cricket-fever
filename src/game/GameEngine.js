import { GAME_STATE, GAME_MODE } from '../utils/constants.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ScoreManager } from './ScoreManager.js';
import { InputManager } from './InputManager.js';
import { AIBowler } from '../ai/AIBowler.js';
import { AIBatsman } from '../ai/AIBatsman.js';
import { HighScoreManager } from './HighScoreManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { Commentary } from '../ui/Commentary.js';

const CATCH_HAND_RADIUS = 0.8;

export class GameEngine {
  constructor({ ball, batsman, bowler, fielders, gameCamera, scoreboard, shotSelector, mainMenu, pitch }) {
    this.ball = ball;
    this.batsman = batsman;
    this.bowler = bowler;
    this.fielders = fielders;
    this.gameCamera = gameCamera;
    this.scoreboard = scoreboard;
    this.shotSelector = shotSelector;
    this.mainMenu = mainMenu;
    this.pitch = pitch;

    this.physics = new PhysicsEngine();
    this.input = new InputManager();
    this.aiBowler = new AIBowler();
    this.aiBatsman = new AIBatsman();
    this.highScores = new HighScoreManager();
    this.sound = new SoundManager();
    this.commentary = new Commentary();
    this.scoreManager = null;
    this._bouncePlayed = false;
    this.bowlingMarker = null;

    // Game mode tracking
    this._gameMode = GAME_MODE.BAT_ONLY;
    this._isPlayerBowling = false;
    this._fullMatchInnings = 0;
    this._fullMatchFirstChoice = null;
    this._fullMatchInnings1Summary = null;

    // Online multiplayer state
    this._isOnline = false;
    this._onlineRole = null; // 'batter' | 'bowler'
    this._onlineOpponentName = null;
    this._onlineBatterName = null;
    this._onlineBowlerName = null;
    this.networkManager = null;
    this.onlineNoticeEl = document.getElementById('online-notice');

    this.state = GAME_STATE.MENU;
    this._waitTimer = 0;
    this._ballTimer = 0;
    this._deliveryData = null;
    this._shotPlayed = false;
    this._shotResult = null;
    this._ballDoneTimer = 0;
    this._ballSettleTimer = 0;
    this._eventPopupTimer = 0;
    this._chaseSent = false;
    this._intercepted = false;
    this._catchingFielder = null;
    this._catchAttempted = false;

    this.ballEventEl = document.getElementById('ball-event');
    this.timingEl = document.getElementById('timing-indicator');
    this.runCounterEl = document.getElementById('run-counter');
    this.boundaryFlash = document.getElementById('boundary-flash');
    this.powerMeter = document.getElementById('power-meter');
    this.powerFill = document.getElementById('power-fill');
    this.powerLabel = document.getElementById('power-label');
    this.resultScreen = document.getElementById('result-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalDetailsEl = document.getElementById('final-details');
    this.playAgainBtn = document.getElementById('btn-play-again');
    this.mainMenuBtn = document.getElementById('btn-main-menu');
    this.endGameBtn = document.getElementById('btn-end-game');
    this.pauseBtn = document.getElementById('btn-pause');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('btn-resume');
    this.pauseMenuBtn = document.getElementById('btn-pause-menu');
    this.newHsBadge = document.getElementById('new-hs-badge');
    this.resultHighScore = document.getElementById('result-high-score');

    this._lastOvers = 5;
    this._paused = false;
    this.touchController = null;
    this._slowMo = false;
    this._slowMoTimer = 0;
    this._slowMoScale = 1;
    this.replayLabel = document.getElementById('replay-label');

    // Two-player state
    this._isTwoPlayer = false;
    this._wasTwoPlayer = false;
    this._currentInnings = 0;
    this._player1Name = '';
    this._player2Name = '';
    this._battingOrder = [];
    this._innings1Summary = null;

    // Two-player UI elements
    this.tossScreen = document.getElementById('toss-screen');
    this.tossTitle = document.getElementById('toss-title');
    this.tossDetail = document.getElementById('toss-detail');
    this.tossContinueBtn = document.getElementById('btn-toss-continue');
    this.inningsBreak = document.getElementById('innings-break');
    this.ibSummary = document.getElementById('ib-summary');
    this.ibDetails = document.getElementById('ib-details');
    this.ibTarget = document.getElementById('ib-target');
    this.ibContinueBtn = document.getElementById('btn-ib-continue');

    this.tossContinueBtn.addEventListener('click', () => this._onTossContinue());
    this.ibContinueBtn.addEventListener('click', () => this._onInningsBreakContinue());

    this.tossChoiceEl = document.getElementById('toss-choice');
    this.btnBatFirst = document.getElementById('btn-bat-first');
    this.btnBowlFirst = document.getElementById('btn-bowl-first');
    this.btnBatFirst.addEventListener('click', () => this._onFullMatchTossChoice('bat'));
    this.btnBowlFirst.addEventListener('click', () => this._onFullMatchTossChoice('bowl'));

    this.playAgainBtn.addEventListener('click', () => {
      this.resultScreen.style.display = 'none';
      document.querySelector('#result-screen h2').textContent = 'INNINGS OVER';
      if (this._isOnline || this._gameMode === GAME_MODE.ONLINE) {
        this._showMenu();
        return;
      }
      if (this._wasTwoPlayer) {
        this.startTwoPlayerMatch(this._lastOvers, this._player1Name, this._player2Name, this._difficulty);
      } else if (this._gameMode === GAME_MODE.FULL_MATCH || this._gameMode === GAME_MODE.BOWL_ONLY) {
        this.startModeMatch(this._lastOvers, this._playerName, this._difficulty, this._gameMode);
      } else {
        this.startMatch(this._lastOvers, this._playerName, this._difficulty);
      }
    });
    this.mainMenuBtn.addEventListener('click', () => this._showMenu());
    this.endGameBtn.addEventListener('click', () => this._endGameEarly());
    this.pauseBtn.addEventListener('click', () => this._togglePause());
    this.resumeBtn.addEventListener('click', () => this._togglePause());
    this.pauseMenuBtn.addEventListener('click', () => {
      this._paused = false;
      this.pauseOverlay.style.display = 'none';
      this._showMenu();
    });

    this.muteBtn = document.getElementById('btn-mute');
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        this.muteBtn.textContent = muted ? 'Unmute' : 'Mute';
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state !== GAME_STATE.MENU && this.state !== GAME_STATE.RESULT) {
        this._togglePause();
      }
      if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') {
        const muted = this.sound.toggleMute();
        if (this.muteBtn) this.muteBtn.textContent = muted ? 'Unmute' : 'Mute';
      }
    });
  }

  _togglePause() {
    this._paused = !this._paused;
    if (this._paused) {
      this.pauseOverlay.style.display = 'flex';
      this.pauseBtn.textContent = 'Resume';
    } else {
      this.pauseOverlay.style.display = 'none';
      this.pauseBtn.textContent = 'Pause';
    }
  }

  startMatch(overs, playerName, difficulty, gameMode) {
    if (!this._isTwoPlayer) this._wasTwoPlayer = false;
    if (gameMode) this._gameMode = gameMode;
    this._isPlayerBowling = (this._gameMode === GAME_MODE.BOWL_ONLY) ||
      (this._gameMode === GAME_MODE.FULL_MATCH && this._fullMatchFirstChoice === 'bowl' && this._fullMatchInnings === 1) ||
      (this._gameMode === GAME_MODE.FULL_MATCH && this._fullMatchFirstChoice === 'bat' && this._fullMatchInnings === 2);
    this._paused = false;
    this.pauseOverlay.style.display = 'none';
    this.pauseBtn.textContent = 'Pause';
    this._lastOvers = overs;
    this._playerName = playerName || 'Unknown';
    this._difficulty = difficulty || 'medium';
    this.aiBowler.setDifficulty(this._difficulty);
    this.aiBatsman.setDifficulty(this._difficulty);
    this.fielders.setDifficulty(this._difficulty);
    this.scoreManager = new ScoreManager(overs);
    this.state = GAME_STATE.WAITING;
    this._waitTimer = 0;
    this.scoreboard.setPlayerName(this._isPlayerBowling ? 'AI' : this._playerName);
    this.scoreboard.show();
    this.scoreboard.setBowling(this._isPlayerBowling);
    if (this._isPlayerBowling) {
      this.shotSelector.hide();
    } else {
      this.shotSelector.show();
    }
    this.endGameBtn.style.display = 'block';
    this.pauseBtn.style.display = 'block';
    if (this.muteBtn) this.muteBtn.style.display = 'block';
    this.scoreboard.update(this.scoreManager);
    this.batsman.resetPose();
    this.bowler.resetPosition();
    this.ball.reset();
    this.fielders.returnToPositions();
    this.gameCamera.resetForNewBall();
    this.sound.startAmbientCrowd();
    if (this.touchController) {
      if (this._isPlayerBowling) {
        this.touchController.showBowling();
      } else {
        this.touchController.show();
      }
    }
    this._startNewBall();
  }

  startModeMatch(overs, playerName, difficulty, mode) {
    this._gameMode = mode;
    this._lastOvers = overs;
    this._playerName = playerName;
    this._difficulty = difficulty;

    if (mode === GAME_MODE.FULL_MATCH) {
      this._fullMatchInnings = 0;
      this._fullMatchInnings1Summary = null;
      this._fullMatchFirstChoice = null;
      this.state = GAME_STATE.TOSS;
      this.tossTitle.textContent = 'You won the toss!';
      this.tossDetail.textContent = 'Choose to bat or bowl first';
      this.tossContinueBtn.style.display = 'none';
      this.tossChoiceEl.style.display = 'flex';
      this.tossScreen.style.display = 'flex';
      return;
    }

    this.startMatch(overs, playerName, difficulty, mode);
  }

  _onFullMatchTossChoice(choice) {
    this._fullMatchFirstChoice = choice;
    this._fullMatchInnings = 1;
    this.tossScreen.style.display = 'none';
    this.tossChoiceEl.style.display = 'none';
    this.tossContinueBtn.style.display = '';
    this.startMatch(this._lastOvers, this._playerName, this._difficulty, GAME_MODE.FULL_MATCH);
  }

  startTwoPlayerMatch(overs, player1, player2, difficulty) {
    this._isTwoPlayer = true;
    this._wasTwoPlayer = true;
    this._lastOvers = overs;
    this._player1Name = player1;
    this._player2Name = player2;
    this._difficulty = difficulty || 'medium';
    this._currentInnings = 0;
    this._innings1Summary = null;

    // Random toss to decide batting order
    const firstBatter = Math.random() < 0.5 ? player1 : player2;
    const secondBatter = firstBatter === player1 ? player2 : player1;
    this._battingOrder = [firstBatter, secondBatter];

    this.state = GAME_STATE.TOSS;
    this.tossTitle.textContent = `${firstBatter} wins the toss!`;
    this.tossDetail.textContent = `${firstBatter} will bat first`;
    this.tossScreen.style.display = 'flex';
  }

  _onTossContinue() {
    this.tossScreen.style.display = 'none';
    this._currentInnings = 1;
    const batter = this._battingOrder[0];
    this.startMatch(this._lastOvers, batter, this._difficulty);
  }

  _onInningsBreakContinue() {
    this.inningsBreak.style.display = 'none';

    // Full match innings break
    if (this._gameMode === GAME_MODE.FULL_MATCH && this._fullMatchInnings === 1) {
      this._fullMatchInnings = 2;
      const target = this._fullMatchInnings1Summary.runs + 1;
      this.startMatch(this._lastOvers, this._playerName, this._difficulty, GAME_MODE.FULL_MATCH);
      this.scoreManager.setTarget(target);
      this.scoreboard.setTarget(target);
      return;
    }

    // Two-player innings break
    this._currentInnings = 2;
    const batter = this._battingOrder[1];
    const target = this._innings1Summary.runs + 1;
    this.startMatch(this._lastOvers, batter, this._difficulty);
    this.scoreManager.setTarget(target);
    this.scoreboard.setTarget(target);
  }

  _startNewBall() {
    this._shotPlayed = false;
    this._shotResult = null;
    this._ballSettleTimer = 0;
    this._chaseSent = false;
    this._intercepted = false;
    this._catchingFielder = null;
    this._catchAttempted = false;
    this._bouncePlayed = false;
    this._interceptRuns = undefined;
    this.ball.reset();
    if (this.pitch) this.pitch.resetBails();
    this.batsman.resetPose();
    this.input.reset();
    this.aiBatsman.reset();
    this.gameCamera.resetForNewBall();
    this.fielders.returnToPositions();

    if (this._isPlayerBowling) {
      this.state = GAME_STATE.AIMING;
      this._waitTimer = 0;
      if (this.bowlingMarker) {
        this.bowlingMarker.setDifficulty(this._difficulty);
        this.bowlingMarker.start();
      }
    } else {
      this.state = GAME_STATE.WAITING;
      this._waitTimer = 0;
    }
  }

  _endGameEarly() {
    this.ball.reset();
    this.bowler.resetPosition();
    this.batsman.resetPose();
    if (this.bowlingMarker) this.bowlingMarker.stop();
    this._showResult();
  }

  _showMenu() {
    this.state = GAME_STATE.MENU;
    this._isTwoPlayer = false;
    this._wasTwoPlayer = false;
    this._gameMode = GAME_MODE.BAT_ONLY;
    this._isPlayerBowling = false;
    this._fullMatchInnings = 0;
    this._isOnline = false;
    this._onlineRole = null;
    if (this.bowlingMarker) this.bowlingMarker.stop();
    this.sound.stopAmbientCrowd();
    this.resultScreen.style.display = 'none';
    this.tossScreen.style.display = 'none';
    this.inningsBreak.style.display = 'none';
    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.ball.reset();
    this.bowler.resetPosition();
    this.batsman.resetPose();
    this.fielders.returnToPositions();
    this.highScores.renderToMenu();
    this._refreshPlayerCards();
    document.getElementById('main-menu').style.display = 'flex';
    document.querySelector('#result-screen h2').textContent = 'INNINGS OVER';
  }

  _refreshPlayerCards() {
    if (this.mainMenu) {
      this.mainMenu.setBestScores(this.highScores.getBestByPlayer());
      this.mainMenu.renderCards();
    }
  }

  update(dt) {
    if (this._paused) return;
    dt = this.applySlowMo(dt);

    this.fielders.update(
      dt,
      this.ball.position,
      this.ball.active,
      this.ball.hasBeenHit
    );

    switch (this.state) {
      case GAME_STATE.MENU:
      case GAME_STATE.TOSS:
      case GAME_STATE.INNINGS_BREAK:
        break;

      case GAME_STATE.AIMING:
        this._updateAiming(dt);
        break;

      case GAME_STATE.WAITING: {
        this._waitTimer += dt;
        if (!this._isOnline) {
          this.shotSelector.update(this.input.getShotDirection(), dt);
        }
        const wmov = this.input.getMovement();
        if (wmov.x !== 0 || wmov.z !== 0) {
          this.batsman.moveInCrease(wmov.x, wmov.z, dt);
        }
        if (!this._isOnline && this._waitTimer >= 1.0) {
          this._beginBowling();
        }
        // In online mode, wait for ball_launched event from server
        break;
      }

      case GAME_STATE.BOWLING:
        this._updateBowling(dt);
        break;

      case GAME_STATE.BATTING:
        this._updateBatting(dt);
        break;

      case GAME_STATE.BALL_DONE:
        this._updateBallDone(dt);
        break;

      case GAME_STATE.RESULT:
        break;
    }

    this.commentary.update(dt);

    if (this._eventPopupTimer > 0) {
      this._eventPopupTimer -= dt;
      if (this._eventPopupTimer <= 0) {
        this.ballEventEl.style.display = 'none';
      }
    }
  }

  _updateAiming(dt) {
    if (!this.bowlingMarker) return;
    this.bowlingMarker.update(dt);

    if (this.input.consumeBowlTrigger()) {
      this.bowlingMarker.onSpacePressed();
    }

    if (this.bowlingMarker.isDone()) {
      this._playerBowlData = this.bowlingMarker.consumeResult();

      if (this._isOnline && this.networkManager) {
        const d = this._playerBowlData;
        this.networkManager.sendBowlInput(d.line, d.length, d.speed);
        this._playerBowlData = null;
        // Wait for server's ball_launched event
        return;
      }

      this._beginBowling();
    }
  }

  _beginBowling() {
    this.state = GAME_STATE.BOWLING;
    this._ballTimer = 0;
    this._shotPlayed = false;

    if (this._isPlayerBowling && this._playerBowlData) {
      const data = this._playerBowlData;
      this.bowler.startBowling((releasePos) => {
        this._deliveryData = this.aiBowler._calculateTrajectory(
          releasePos, data.speed, data.line,
          this._lengthZToFactor(data.length), 0
        );
        this.ball.launch(releasePos, this._deliveryData.velocity);
        this.sound.playBowlRelease();
      });
      this._playerBowlData = null;
    } else {
      this.bowler.startBowling((releasePos) => {
        this._deliveryData = this.aiBowler.generateDelivery(releasePos);
        this.ball.launch(releasePos, this._deliveryData.velocity);
        this.sound.playBowlRelease();
      });
    }
  }

  _lengthZToFactor(z) {
    const min = -6.5;
    const max = 8.5;
    return Math.max(0.2, Math.min(0.9, (z - min) / (max - min)));
  }

  _updateBowling(dt) {
    this.bowler.update(dt);
    this.ball.update(dt);
    this.batsman.update(dt);

    if (!this._isPlayerBowling) {
      this.shotSelector.update(this.input.getShotDirection(), dt);
    }

    if (!this._shotPlayed && !this._isPlayerBowling) {
      const mov = this.input.getMovement();
      if (mov.x !== 0 || mov.z !== 0) {
        this.batsman.moveInCrease(mov.x, mov.z, dt);
      }
    }

    if (this.ball.active) {
      this.gameCamera.followBall(this.ball.position, false);
      if (!this._bouncePlayed && this.ball.hasBounced) {
        this._bouncePlayed = true;
        this.sound.playBounce();
      }
    }

    if (!this._shotPlayed) {
      if (this._isOnline) {
        if (this._onlineRole === 'batter') {
          const trigger = this.input.consumeShotTrigger();
          if (trigger && this.ball.active) {
            if (this.networkManager) {
              this.networkManager.sendShotInput(
                trigger.shot,
                trigger.lofted,
                this.batsman.group.position.x,
                this.batsman.group.position.z
              );
            }
            this._attemptShot(trigger);
          }
        }
      } else if (this._isPlayerBowling) {
        this._updateAIBatting();
      } else {
        const trigger = this.input.consumeShotTrigger();
        if (trigger) {
          if (this.ball.active) {
            this._attemptShot(trigger);
          } else {
            this.batsman.playShot(trigger.shot);
            this._shotPlayed = false;
          }
        }
      }
    }

    if (this.ball.active && !this.ball.hasBeenHit) {
      if (this._isOnline) {
        // In online mode, only the batter's client detects bowled/dot and reports to server
        if (this._onlineRole === 'batter') {
          if (this.physics.checkBowled(this.ball)) {
            this._handleWicket('bowled');
            return;
          }
          if (this.ball.position.z > this.batsman.group.position.z + 8) {
            this._handleDotBall();
            return;
          }
        }
      } else {
        if (this.physics.checkBowled(this.ball)) {
          this._handleWicket('bowled');
          return;
        }
        if (this.ball.position.z > this.batsman.group.position.z + 8) {
          this._handleDotBall();
          return;
        }
      }
    }

    if (this.ball.active && this.ball.hasBeenHit) {
      this.state = GAME_STATE.BATTING;
    }
  }

  _updateAIBatting() {
    if (!this.ball.active) return;
    const decision = this.aiBatsman.tryDecide(this.ball);
    if (decision) {
      this._attemptShot({ shot: decision.shot, lofted: decision.lofted });
    }
  }

  _attemptShot(trigger) {
    this._shotPlayed = true;

    const timing = this.physics.calculateTimingQuality(this.ball);
    this.batsman.playShot(trigger.shot);

    if (timing === 'miss') {
      this._showTimingIndicator('miss', 'clean');
      return;
    }

    const ballRelativeX = this.ball.position.x - this.batsman.group.position.x;
    const reach = this.physics.checkShotReach(trigger.shot, ballRelativeX);

    if (reach === 'air') {
      this._showTimingIndicator(timing, 'air');
      this.commentary.onMiss();
      return;
    }

    this._showTimingIndicator(timing, reach);

    let velocity = this.physics.calculateShotVelocity(trigger.shot, trigger.lofted, timing);
    if (velocity) {
      if (reach === 'edge') {
        velocity.multiplyScalar(0.25);
        velocity.x += (Math.random() - 0.5) * 4;
        velocity.y = Math.min(velocity.y, 2);
        this.sound.playEdge();
      }
      this.ball.hitByBat(velocity);
      if (reach !== 'edge') this.sound.playBatCrack();
      this._showPowerMeter(velocity);
      this._shotResult = {
        type: 'hit',
        shot: trigger.shot,
        timing,
        lofted: reach === 'edge' ? false : trigger.lofted,
      };
    }
  }

  _updateBatting(dt) {
    this.ball.update(dt);
    this.batsman.update(dt);
    this.bowler.update(dt);
    this.gameCamera.followBall(this.ball.position, true);

    // Send fielders chasing once after ball is hit
    if (!this._chaseSent && this.ball.hasBeenHit) {
      this.fielders.snapshotPositions();
      this.fielders.chaseBall(this.ball.position, this.ball.velocity);
      this.fielders.recordShotDirection(this.ball.velocity.x * 2, this.ball.velocity.z * 2);
      this._chaseSent = true;
    }

    // In online mode, only the batter's client detects outcomes and reports to server.
    // The bowler's client just animates visually and waits for ball_result from server.
    const canDetectOutcome = !this._isOnline || this._onlineRole === 'batter';

    // Check boundary first
    if (canDetectOutcome) {
      if (this.ball.isSix()) {
        this._handleBoundary(6);
        return;
      }
      if (this.ball.isFour()) {
        this._handleBoundary(4);
        return;
      }
    }

    // Catch logic: ball must literally fall into a fielder's hands
    if (this._catchingFielder) {
      const cf = this._catchingFielder;
      this.ball.position.set(cf.group.position.x, cf.group.position.y + 1.6, cf.group.position.z);
      this.ball.mesh.position.copy(this.ball.position);
      this.ball.velocity.set(0, 0, 0);
      if (this.fielders.didDropCatch(cf)) {
        this._catchingFielder = null;
        this._showBallEvent('DROPPED!');
        this.commentary.onDrop && this.commentary.onDrop();
        this.ball.velocity.set((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3);
        this.ball.active = true;
        this.ball.settled = false;
        cf.willDrop = false;
      } else if (this.fielders.isCatchComplete(cf)) {
        this._catchingFielder = null;
        if (canDetectOutcome) {
          this._handleWicket('caught');
          return;
        }
      }
    } else if (!this._catchAttempted
               && this.ball.position.y > 1.2 && this.ball.position.y < 2.2
               && this.ball.velocity.y < -1.0) {
      this._catchAttempted = true;
      if (this._shotResult && this._shotResult.lofted) {
        const catchOpp = this.fielders.checkCatchOpportunity(this.ball.position);
        if (catchOpp && catchOpp.distance < CATCH_HAND_RADIUS) {
          this._catchingFielder = catchOpp.fielder;
          this.fielders.triggerCatch(catchOpp.fielder);
          this.ball.active = false;
          this.ball.mesh.visible = true;
          return;
        }
      }
    }

    // Check if a fielder intercepted the ball on the ground
    if (!this._intercepted && this.ball.position.y < 0.5) {
      const intercept = this.fielders.checkIntercept(this.ball.position);
      if (intercept) {
        this._intercepted = true;
        if (intercept.isDive) {
          this.fielders.triggerDive(intercept.fielder);
        }
        const distFromCenter = this.ball.getDistanceFromCenter();
        let interceptRuns = 0;
        if (distFromCenter > 40) interceptRuns = 2;
        else if (distFromCenter > 20) interceptRuns = 1;
        this._interceptRuns = interceptRuns;

        this.ball.velocity.set(0, 0, 0);
        this.ball.settled = true;
        this.fielders.startReturnThrow(intercept.fielder);
      }
    }

    // Check for overthrow (visual only — runs handled via ball_result in online mode)
    if (!this._isOnline && this.fielders.isOverthrow()) {
      const extra = this.fielders.getOverthrowRuns();
      this.fielders.consumeOverthrow();
      this.scoreManager.addRuns(extra);
      this.scoreboard.update(this.scoreManager);
      this._showBallEvent(`OVERTHROW! +${extra}`);
      this._showRunCounter(extra);
      this.commentary.onRuns(extra);
    }

    // Ball settled on field
    if (canDetectOutcome && (this.ball.settled || this._ballSettledTimeout(dt))) {
      let runs;
      if (this._intercepted && this._interceptRuns !== undefined) {
        runs = this._interceptRuns;
      } else {
        runs = this.physics.estimateRuns(this.ball, this.fielders);
      }
      this._handleRuns(runs);
    } else if (!canDetectOutcome) {
      // Bowler client: still advance the settle timer so animations don't freeze
      this._ballSettledTimeout(dt);
    }
  }

  _ballSettledTimeout(dt) {
    this._ballSettleTimer += dt;
    if (this._ballSettleTimer > 6) {
      this._ballSettleTimer = 0;
      return true;
    }
    return false;
  }

  _handleBoundary(runs) {
    if (this._isOnline) {
      this._sendOnlineBallResult(runs, false, null, true);
      return;
    }
    this.scoreManager.addRuns(runs);
    this.scoreManager.addBall();
    if (this._isPlayerBowling) this.scoreManager.addBowlerBall(runs);
    this.scoreboard.update(this.scoreManager);
    if (this._isTwoPlayer && this.scoreManager.isTargetReached()) {
      this._showBallEvent('TARGET REACHED!');
    } else {
      this._showBallEvent(runs === 6 ? 'SIX!' : 'FOUR!');
    }
    this._showRunCounter(runs);
    this._showBoundaryFlash(runs === 6);
    this.sound.playBoundaryCheer(runs === 6);
    if (runs === 6) this.commentary.onSix(); else this.commentary.onFour();
    this._triggerSlowMo(runs === 6 ? 1.5 : 1.0);
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _handleRuns(runs) {
    if (this._isOnline) {
      this._sendOnlineBallResult(runs, false, null, false);
      return;
    }
    this.scoreManager.addRuns(runs);
    this.scoreManager.addBall();
    if (this._isPlayerBowling) this.scoreManager.addBowlerBall(runs);
    this.scoreboard.update(this.scoreManager);
    if (this._isTwoPlayer && this.scoreManager.isTargetReached()) {
      this._showBallEvent('TARGET REACHED!');
      this._showRunCounter(runs);
      this.sound.playBoundaryCheer(false);
    } else if (runs === 0) {
      this._showBallEvent('DOT');
      this.sound.playDotBall();
      this.commentary.onDot();
    } else {
      this._showBallEvent(`${runs} run${runs > 1 ? 's' : ''}`);
      this._showRunCounter(runs);
      this.commentary.onRuns(runs);
    }
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _handleDotBall() {
    if (this._isOnline) {
      this._sendOnlineBallResult(0, false, null, false);
      return;
    }
    this.scoreManager.addRuns(0);
    this.scoreManager.addBall();
    if (this._isPlayerBowling) this.scoreManager.addBowlerBall(0);
    this.scoreManager.lastBallResult = 'dot';
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent('DOT');
    this.sound.playDotBall();
    this.commentary.onDot();
    this._finishBall();
  }

  _handleWicket(type) {
    if (this._isOnline) {
      this._sendOnlineBallResult(0, true, type, false);
      return;
    }
    this.scoreManager.addWicket(type);
    this.scoreManager.addBall();
    if (this._isPlayerBowling) {
      this.scoreManager.addBowlerBall(0);
      this.scoreManager.addBowlerWicket();
    }
    this.scoreboard.update(this.scoreManager);
    this._showBallEvent(`WICKET!\n${type.toUpperCase()}`);
    if (type === 'bowled') {
      this.sound.playWicketFall();
      this.commentary.onBowled();
      if (this.pitch) this.pitch.triggerBailsFly();
    } else {
      this.sound.playCatchCheer();
      this.commentary.onCaught();
    }
    this._triggerSlowMo(1.5);
    this._ballSettleTimer = 0;
    this._finishBall();
  }

  _sendOnlineBallResult(runs, wicket, wicketType, isBoundary) {
    if (!this.networkManager) return;
    // Only the batter's client reports ball results to avoid double-counting
    if (this._onlineRole !== 'batter') return;
    this.networkManager.sendBallResult({ runs, wicket, wicketType, isBoundary });
  }

  _finishBall() {
    this.state = GAME_STATE.BALL_DONE;
    this._ballDoneTimer = 0;
    this.fielders.returnToPositions();
  }

  _updateBallDone(dt) {
    this._ballDoneTimer += dt;
    this.batsman.update(dt);
    this.bowler.update(dt);
    if (this.pitch) this.pitch.updateBails(dt);

    if (this._isOnline) {
      // In online mode, server drives the next ball via new_ball event
      return;
    }

    if (this._ballDoneTimer >= 2.0) {
      if (this.scoreManager.isInningsOver()) {
        this._showResult();
      } else {
        this._startNewBall();
      }
    }
  }

  _showResult() {
    this.state = GAME_STATE.RESULT;
    this.sound.stopAmbientCrowd();
    if (this.bowlingMarker) this.bowlingMarker.stop();
    const summary = this.scoreManager.getSummary();
    summary.playerName = this._playerName;

    // Full Match: after 1st innings, show innings break
    if (this._gameMode === GAME_MODE.FULL_MATCH && this._fullMatchInnings === 1) {
      this._fullMatchInnings1Summary = summary;
      this.state = GAME_STATE.INNINGS_BREAK;
      this.scoreboard.hide();
      this.shotSelector.hide();
      this.endGameBtn.style.display = 'none';
      this.pauseBtn.style.display = 'none';
      if (this.muteBtn) this.muteBtn.style.display = 'none';
      if (this.touchController) this.touchController.hide();

      const target = summary.runs + 1;
      const whoWasBatting = this._isPlayerBowling ? 'AI' : this._playerName;
      this.ibSummary.textContent = `${whoWasBatting}: ${summary.runs}/${summary.wickets}`;
      this.ibDetails.textContent = `Overs: ${summary.overs} | RR: ${summary.runRate}`;
      this.ibTarget.textContent = `Target: ${target} runs`;
      this.inningsBreak.style.display = 'flex';
      return;
    }

    // Full Match: after 2nd innings, show final result
    if (this._gameMode === GAME_MODE.FULL_MATCH && this._fullMatchInnings === 2) {
      this._showFullMatchResult(summary);
      return;
    }

    // Two-player: after 1st innings, show innings break instead of final result
    if (this._isTwoPlayer && this._currentInnings === 1) {
      this._innings1Summary = summary;
      this.state = GAME_STATE.INNINGS_BREAK;
      this.scoreboard.hide();
      this.shotSelector.hide();
      this.endGameBtn.style.display = 'none';
      this.pauseBtn.style.display = 'none';
      if (this.muteBtn) this.muteBtn.style.display = 'none';
      if (this.touchController) this.touchController.hide();

      const target = summary.runs + 1;
      this.ibSummary.textContent = `${this._battingOrder[0]}: ${summary.runs}/${summary.wickets}`;
      this.ibDetails.textContent = `Overs: ${summary.overs} | RR: ${summary.runRate}`;
      this.ibTarget.textContent = `Target: ${target} runs`;
      this.inningsBreak.style.display = 'flex';
      return;
    }

    // Two-player: after 2nd innings, show final match result
    if (this._isTwoPlayer && this._currentInnings === 2) {
      this._showTwoPlayerResult(summary);
      return;
    }

    // Solo mode result
    const { rank, isNew } = this.highScores.submit(summary);

    this.finalScoreEl.textContent = `${summary.runs}/${summary.wickets}`;
    this.finalDetailsEl.innerHTML = [
      `Overs: ${summary.overs}`,
      `Run Rate: ${summary.runRate}`,
      `Fours: ${summary.fours} | Sixes: ${summary.sixes}`,
      `Strike Rate: ${summary.strikeRate}`,
    ].join('<br>');

    if (isNew && rank === 1) {
      this.newHsBadge.style.display = 'block';
    } else {
      this.newHsBadge.style.display = 'none';
    }

    const highest = this.highScores.getHighest();
    if (highest && !(isNew && rank === 1)) {
      this.resultHighScore.textContent = `Best: ${highest.name || '—'} — ${highest.runs}/${highest.wickets}`;
    } else {
      this.resultHighScore.textContent = '';
    }

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
  }

  _showTwoPlayerResult(innings2Summary) {
    const p1 = this._battingOrder[0];
    const p2 = this._battingOrder[1];
    const i1 = this._innings1Summary;
    const i2 = innings2Summary;

    let headline;
    if (i2.runs >= i1.runs + 1) {
      const wicketsLeft = 10 - i2.wickets;
      headline = `${p2} wins by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}!`;
    } else if (i2.runs === i1.runs) {
      headline = 'Match Tied!';
    } else {
      const margin = i1.runs - i2.runs;
      headline = `${p1} wins by ${margin} run${margin !== 1 ? 's' : ''}!`;
    }

    this.newHsBadge.style.display = 'none';
    this.resultHighScore.textContent = '';
    document.querySelector('#result-screen h2').textContent = headline;
    this.finalScoreEl.textContent = '';
    this.finalDetailsEl.innerHTML = [
      `<strong>${p1}:</strong> ${i1.runs}/${i1.wickets} (${i1.overs} ov)`,
      `RR: ${i1.runRate} | 4s: ${i1.fours} | 6s: ${i1.sixes}`,
      '',
      `<strong>${p2}:</strong> ${i2.runs}/${i2.wickets} (${i2.overs} ov)`,
      `RR: ${i2.runRate} | 4s: ${i2.fours} | 6s: ${i2.sixes}`,
    ].join('<br>');

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
    this._isTwoPlayer = false;
  }

  _showFullMatchResult(innings2Summary) {
    const i1 = this._fullMatchInnings1Summary;
    const i2 = innings2Summary;
    const playerBattedFirst = this._fullMatchFirstChoice === 'bat';

    let headline;
    if (playerBattedFirst) {
      if (i2.runs >= i1.runs + 1) {
        headline = 'AI wins! You lost.';
      } else if (i2.runs === i1.runs) {
        headline = 'Match Tied!';
      } else {
        headline = `You win by ${i1.runs - i2.runs} runs!`;
      }
    } else {
      if (i2.runs >= i1.runs + 1) {
        const wktsLeft = 10 - i2.wickets;
        headline = `You win by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}!`;
      } else if (i2.runs === i1.runs) {
        headline = 'Match Tied!';
      } else {
        headline = `AI wins by ${i1.runs - i2.runs} runs!`;
      }
    }

    this.newHsBadge.style.display = 'none';
    this.resultHighScore.textContent = '';
    document.querySelector('#result-screen h2').textContent = headline;
    this.finalScoreEl.textContent = '';

    const inn1Label = playerBattedFirst ? `${this._playerName} (Batting)` : 'AI (Batting)';
    const inn2Label = playerBattedFirst ? 'AI (Batting)' : `${this._playerName} (Batting)`;
    this.finalDetailsEl.innerHTML = [
      `<strong>${inn1Label}:</strong> ${i1.runs}/${i1.wickets} (${i1.overs} ov)`,
      `RR: ${i1.runRate} | 4s: ${i1.fours} | 6s: ${i1.sixes}`,
      '',
      `<strong>${inn2Label}:</strong> ${i2.runs}/${i2.wickets} (${i2.overs} ov)`,
      `RR: ${i2.runRate} | 4s: ${i2.fours} | 6s: ${i2.sixes}`,
    ].join('<br>');

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
  }

  // ─── Online Multiplayer Methods ───

  startOnlineInnings({ innings: _innings, overs, target, iAmBatter, batterName, bowlerName, opponentName }) {
    this._isOnline = true;
    this._gameMode = GAME_MODE.ONLINE;
    this._onlineRole = iAmBatter ? 'batter' : 'bowler';
    this._isPlayerBowling = !iAmBatter;
    this._onlineOpponentName = opponentName;
    this._onlineBatterName = batterName;
    this._onlineBowlerName = bowlerName;
    this._paused = false;
    this.pauseOverlay.style.display = 'none';
    this.pauseBtn.textContent = 'Pause';
    this._lastOvers = overs;

    this.aiBowler.setDifficulty('medium');
    this.scoreManager = new ScoreManager(overs);

    if (target) {
      this.scoreManager.setTarget(target);
      this.scoreboard.setTarget(target);
    }

    this.scoreboard.setPlayerName(batterName);
    this.scoreboard.show();
    this.scoreboard.setBowling(!iAmBatter);
    this.scoreboard.setOnlineInfo(this._onlineRole, opponentName);

    if (iAmBatter) {
      this.shotSelector.show();
      if (this.touchController) this.touchController.show();
    } else {
      this.shotSelector.hide();
      if (this.touchController) this.touchController.showBowling();
    }

    this.endGameBtn.style.display = 'block';
    this.pauseBtn.style.display = 'block';
    if (this.muteBtn) this.muteBtn.style.display = 'block';
    this.scoreboard.update(this.scoreManager);
    this.batsman.resetPose();
    this.bowler.resetPosition();
    this.ball.reset();
    this.fielders.returnToPositions();
    this.gameCamera.resetForNewBall();
    this.sound.startAmbientCrowd();

    this.state = GAME_STATE.WAITING;
  }

  onlineNewBall(data) {
    // Sync score from server on each new ball
    if (data && data.score) {
      const score = data.score;
      this.scoreManager.runs = score.runs;
      this.scoreManager.wickets = score.wickets;
      this.scoreManager.ballsFaced = parseInt(score.overs.split('.')[0]) * 6 + parseInt(score.overs.split('.')[1]);
      this.scoreManager.fours = score.fours;
      this.scoreManager.sixes = score.sixes;
      this.scoreManager.batsmanRuns = score.batsmanRuns;
      this.scoreManager.batsmanBalls = score.batsmanBalls;
      if (score.target) this.scoreManager.setTarget(score.target);
      this.scoreManager.lastBallResult = score.lastBallResult;
      this.scoreboard.update(this.scoreManager);
    }

    this._shotPlayed = false;
    this._shotResult = null;
    this._ballSettleTimer = 0;
    this._chaseSent = false;
    this._intercepted = false;
    this._catchingFielder = null;
    this._catchAttempted = false;
    this._bouncePlayed = false;
    this._interceptRuns = undefined;
    this.ball.reset();
    if (this.pitch) this.pitch.resetBails();
    this.batsman.resetPose();
    this.input.reset();
    this.gameCamera.resetForNewBall();
    this.fielders.returnToPositions();

    if (this._onlineRole === 'bowler') {
      this.state = GAME_STATE.AIMING;
      this._waitTimer = 0;
      if (this.bowlingMarker) {
        this.bowlingMarker.setDifficulty('medium');
        this.bowlingMarker.start();
      }
    } else {
      this.state = GAME_STATE.WAITING;
      this._waitTimer = 0;
    }
  }

  onlineBallLaunched(data) {
    const { delivery, seed } = data;
    this.physics.setSeed(seed);

    this.state = GAME_STATE.BOWLING;
    this._ballTimer = 0;
    this._shotPlayed = false;

    if (this.bowlingMarker) this.bowlingMarker.stop();

    this.bowler.startBowling((releasePos) => {
      const vel = delivery.velocity;
      this.ball.launch(releasePos, { x: vel.x, y: vel.y, z: vel.z });
      this.sound.playBowlRelease();
    });
  }

  onlineShotPlayed(data) {
    const { shot, lofted, seed } = data;

    // The batter's client already executed this shot locally via input.
    // Only the bowler's client needs to replay it from the server event.
    if (this._onlineRole === 'batter') return;

    this.physics.setSeed(seed);

    if (!this.ball.active) return;

    this._shotPlayed = true;
    const timing = this.physics.calculateTimingQuality(this.ball);
    this.batsman.playShot(shot);

    if (timing === 'miss') {
      this._showTimingIndicator('miss', 'clean');
      this.physics.setSeed(null);
      return;
    }

    const ballRelativeX = this.ball.position.x - this.batsman.group.position.x;
    const reach = this.physics.checkShotReach(shot, ballRelativeX);

    if (reach === 'air') {
      this._showTimingIndicator(timing, 'air');
      this.commentary.onMiss();
      this.physics.setSeed(null);
      return;
    }

    this._showTimingIndicator(timing, reach);

    let velocity = this.physics.calculateShotVelocity(shot, lofted, timing);
    if (velocity) {
      if (reach === 'edge') {
        velocity.multiplyScalar(0.25);
        velocity.x += (this.physics._rand() - 0.5) * 4;
        velocity.y = Math.min(velocity.y, 2);
        this.sound.playEdge();
      }
      this.ball.hitByBat(velocity);
      if (reach !== 'edge') this.sound.playBatCrack();
      this._showPowerMeter(velocity);
      this._shotResult = {
        type: 'hit',
        shot,
        timing,
        lofted: reach === 'edge' ? false : lofted,
      };
    }

    this.physics.setSeed(null);
  }

  onlineBallResult(data) {
    const { runs, wicket, wicketType, isBoundary, score, inningsOver } = data;

    // Use server-authoritative score to sync both clients
    if (score) {
      this.scoreManager.runs = score.runs;
      this.scoreManager.wickets = score.wickets;
      this.scoreManager.ballsFaced = parseInt(score.overs.split('.')[0]) * 6 + parseInt(score.overs.split('.')[1]);
      this.scoreManager.fours = score.fours;
      this.scoreManager.sixes = score.sixes;
      this.scoreManager.batsmanRuns = score.batsmanRuns;
      this.scoreManager.batsmanBalls = score.batsmanBalls;
      if (score.target) this.scoreManager.setTarget(score.target);
      this.scoreManager.lastBallResult = score.lastBallResult;
    }

    this.scoreboard.update(this.scoreManager);

    // Visual/audio feedback
    if (wicket) {
      this._showBallEvent(`WICKET!\n${wicketType.toUpperCase()}`);
      if (wicketType === 'bowled') {
        this.sound.playWicketFall();
        this.commentary.onBowled();
        if (this.pitch) this.pitch.triggerBailsFly();
      } else {
        this.sound.playCatchCheer();
        this.commentary.onCaught();
      }
      this._triggerSlowMo(1.5);
    } else if (isBoundary) {
      this._showBallEvent(runs === 6 ? 'SIX!' : 'FOUR!');
      this._showRunCounter(runs);
      this._showBoundaryFlash(runs === 6);
      this.sound.playBoundaryCheer(runs === 6);
      if (runs === 6) this.commentary.onSix(); else this.commentary.onFour();
      this._triggerSlowMo(runs === 6 ? 1.5 : 1.0);
    } else if (runs === 0) {
      this._showBallEvent('DOT');
      this.sound.playDotBall();
      this.commentary.onDot();
    } else {
      this._showBallEvent(`${runs} run${runs > 1 ? 's' : ''}`);
      this._showRunCounter(runs);
      this.commentary.onRuns(runs);
    }

    this._finishBall();

    if (inningsOver) {
      // Server will send innings_break or match_result
    }
  }

  onlineInningsBreak(data) {
    this.state = GAME_STATE.INNINGS_BREAK;
    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    if (this.bowlingMarker) this.bowlingMarker.stop();

    this.ibSummary.textContent = `${data.summary.innings === 1 ? this._onlineBatterName : this._onlineBowlerName}: ${data.summary.runs}/${data.summary.wickets}`;
    this.ibDetails.textContent = `Overs: ${data.summary.overs} | RR: ${data.summary.runRate}`;
    this.ibTarget.textContent = `Target: ${data.target} runs`;

    this.ibContinueBtn.style.display = 'none';
    this.inningsBreak.style.display = 'flex';
  }

  onlineMatchResult(data) {
    this.state = GAME_STATE.RESULT;
    this._isOnline = false;
    this.sound.stopAmbientCrowd();
    if (this.bowlingMarker) this.bowlingMarker.stop();

    this.newHsBadge.style.display = 'none';
    this.resultHighScore.textContent = '';
    document.querySelector('#result-screen h2').textContent = data.headline;
    this.finalScoreEl.textContent = '';

    const i1 = data.innings1;
    const i2 = data.innings2;
    this.finalDetailsEl.innerHTML = [
      `<strong>${i1.batterName} (Batting):</strong> ${i1.runs}/${i1.wickets} (${i1.overs} ov)`,
      `RR: ${i1.runRate} | 4s: ${i1.fours} | 6s: ${i1.sixes}`,
      '',
      `<strong>${i2.batterName} (Batting):</strong> ${i2.runs}/${i2.wickets} (${i2.overs} ov)`,
      `RR: ${i2.runRate} | 4s: ${i2.fours} | 6s: ${i2.sixes}`,
    ].join('<br>');

    this.scoreboard.hide();
    this.shotSelector.hide();
    this.endGameBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    if (this.muteBtn) this.muteBtn.style.display = 'none';
    if (this.touchController) this.touchController.hide();
    this.resultScreen.style.display = 'flex';
  }

  showOnlineNotice(text) {
    if (this.onlineNoticeEl) {
      this.onlineNoticeEl.textContent = text;
      this.onlineNoticeEl.style.display = 'block';
      setTimeout(() => {
        this.onlineNoticeEl.style.display = 'none';
      }, 4000);
    }
  }

  // ─── End Online Methods ───

  _triggerSlowMo(duration) {
    this._slowMo = true;
    this._slowMoTimer = duration;
    this._slowMoScale = 0.2;
    if (this.replayLabel) this.replayLabel.style.display = 'block';
  }

  applySlowMo(dt) {
    if (!this._slowMo) return dt;
    this._slowMoTimer -= dt;
    if (this._slowMoTimer <= 0) {
      this._slowMo = false;
      this._slowMoScale = 1;
      if (this.replayLabel) this.replayLabel.style.display = 'none';
      return dt;
    }
    return dt * this._slowMoScale;
  }

  _showBallEvent(text) {
    this.ballEventEl.textContent = text;
    this.ballEventEl.style.display = 'block';
    this._eventPopupTimer = 1.5;
  }

  _showBoundaryFlash(isSix) {
    this.boundaryFlash.className = isSix ? 'six' : 'four';
    this.boundaryFlash.style.opacity = '1';
    setTimeout(() => { this.boundaryFlash.style.opacity = '0'; }, 300);
  }

  _showPowerMeter(velocity) {
    if (!velocity) return;
    const speed = velocity.length();
    // Max around 45 m/s
    const pct = Math.min(speed / 45, 1) * 100;
    this.powerMeter.style.display = 'block';
    this.powerLabel.style.display = 'block';
    this.powerFill.style.height = `${pct}%`;
    if (pct > 75) {
      this.powerFill.style.background = 'linear-gradient(to top, #ff4444, #ff8844)';
    } else if (pct > 40) {
      this.powerFill.style.background = 'linear-gradient(to top, #ffaa33, #ffdd44)';
    } else {
      this.powerFill.style.background = 'linear-gradient(to top, #44aa66, #88dd88)';
    }
    clearTimeout(this._powerTimeout);
    this._powerTimeout = setTimeout(() => {
      this.powerMeter.style.display = 'none';
      this.powerLabel.style.display = 'none';
    }, 2500);
  }

  _showTimingIndicator(timing, reach) {
    const labels = {
      perfect: 'Perfect!',
      good: 'Good',
      early_late: 'Mistimed',
      miss: 'Missed!',
    };
    const label = reach === 'edge' ? 'Edge!' : (labels[timing] || '');
    const cssClass = reach === 'edge' ? 'edge' : timing;

    this.timingEl.textContent = label;
    this.timingEl.className = cssClass;
    this.timingEl.style.display = 'block';
    this.timingEl.style.animation = 'none';
    void this.timingEl.offsetHeight;
    this.timingEl.style.animation = '';
    setTimeout(() => { this.timingEl.style.display = 'none'; }, 700);
  }

  _showRunCounter(runs) {
    if (runs <= 0) return;
    this.runCounterEl.textContent = `+${runs}`;
    this.runCounterEl.style.display = 'block';
    this.runCounterEl.style.animation = 'none';
    void this.runCounterEl.offsetHeight;
    this.runCounterEl.style.animation = '';
    setTimeout(() => { this.runCounterEl.style.display = 'none'; }, 1300);
  }
}
