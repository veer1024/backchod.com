import { VoiceController } from "./voice-controller.js";

console.log("[game.js] file loaded");

export class PakRunnerGame {
  constructor({ containerId, hud, mic }) {
    console.log("[PakRunnerGame] constructor called", { containerId, hud, mic });

    this.containerId = containerId;
    this.hud = hud;
    this.mic = mic;
    this.voice = new VoiceController();

    this.game = null;
    this.sceneRef = null;

    this.score = 0;
    this.coins = 0;
    this.best = Number(localStorage.getItem("pak_runner_best_score") || "0");

    this.player = null;
    this.cursorsEnabled = false;
    this.worldSpeed = 180;
    this.started = false;
  }

  applyCalibration(thresholds) {
    console.log("[PakRunnerGame] applyCalibration", thresholds);
    this.voice.setThresholds(thresholds);
  }

  createGame() {
    console.log("[PakRunnerGame] createGame called");

    const self = this;

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.containerId,
      width: 1000,
      height: 640,
      backgroundColor: "#dbeafe",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 1100 },
          debug: false,
        },
      },
      scene: {
        preload() {
          console.log("[Phaser] preload()");
          self.preload(this);
        },
        create() {
          console.log("[Phaser] create()");
          self.create(this);
        },
        update(time, delta) {
          self.update(this, time, delta);
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    console.log("[PakRunnerGame] Phaser.Game instance created", this.game);
  }

  preload(scene) {
  console.log("[PakRunnerGame] preload assets");

  scene.load.image("bg", "./assets/bg.png");
  scene.load.image("player", "./assets/player.png");
  scene.load.image("coin", "./assets/coin.png");
  scene.load.image("hurdle", "./assets/hurdle.png");

  scene.load.on("filecomplete", (key) => {
    console.log("[Phaser] loaded:", key);
  });

  scene.load.on("loaderror", (file) => {
    console.error("[Phaser] failed to load:", file.key, file.src);
  });
}

  create(scene) {
  console.log("[PakRunnerGame] create scene started");
  this.sceneRef = scene;

  // Background image
  const bg = scene.add.image(500, 320, "bg");
  if (bg.texture?.key !== "__MISSING") {
    bg.setDisplaySize(1000, 640);
  } else {
    console.warn("[PakRunnerGame] bg missing, using fallback rectangles");
    scene.add.rectangle(500, 320, 1000, 640, 0xe0f2fe);
  }

  // Soft mid-ground strip
  scene.add.rectangle(500, 560, 1000, 160, 0xbbf7d0);

  const ground = scene.add.rectangle(500, 610, 1000, 60, 0x84cc16);
  scene.physics.add.existing(ground, true);

  // Player image
  this.player = scene.physics.add.sprite(140, 510, "player");

  if (this.player.texture?.key === "__MISSING") {
    console.warn("[PakRunnerGame] player image missing, using fallback rectangle");
    this.player.destroy();

    this.player = scene.add.rectangle(140, 510, 50, 70, 0xf59e0b);
    scene.physics.add.existing(this.player);
  } else {
    this.player.setDisplaySize(70, 70);
  }

  this.player.body.setCollideWorldBounds(true);
  scene.physics.add.collider(this.player, ground);

  this.hurdles = scene.physics.add.group();
  this.coinsGroup = scene.physics.add.group();

  scene.physics.add.collider(this.hurdles, ground);

  scene.physics.add.overlap(this.player, this.coinsGroup, (_, coin) => {
    console.log("[PakRunnerGame] coin collected");
    coin.destroy();
    this.coins += 1;
    this.updateHud();
  });

  scene.physics.add.overlap(this.player, this.hurdles, () => {
    console.log("[PakRunnerGame] hurdle collision -> gameOver");
    this.gameOver();
  });

  scene.time.addEvent({
    delay: 1500,
    callback: () => this.spawnHurdle(),
    loop: true,
  });

  scene.time.addEvent({
    delay: 1100,
    callback: () => this.spawnCoin(),
    loop: true,
  });

  this.updateHud();
  this.started = true;

  console.log("[PakRunnerGame] create scene finished, game started");
}

  spawnHurdle() {
  if (!this.sceneRef || !this.started) return;

  console.log("[PakRunnerGame] spawnHurdle");

  const hurdle = this.hurdles.create(1080, 520, "hurdle");

  if (!hurdle.texture || hurdle.texture.key === "__MISSING") {
    console.warn("[PakRunnerGame] hurdle asset missing, using fallback rectangle");
    hurdle.destroy();

    const rect = this.sceneRef.add.rectangle(1080, 520, 42, 58, 0xef4444);
    this.sceneRef.physics.add.existing(rect);
    rect.body.setVelocityX(-this.worldSpeed);
    rect.body.setImmovable(true);
    rect.body.setAllowGravity(false);
    this.hurdles.add(rect);
    return;
  }

  hurdle.setDisplaySize(52, 60);
  hurdle.body.setVelocityX(-this.worldSpeed);
  hurdle.body.setAllowGravity(true);
  hurdle.body.setImmovable(true);
}

  spawnCoin() {
  if (!this.sceneRef || !this.started) return;

  const y = Phaser.Math.Between(400, 500);
  console.log("[PakRunnerGame] spawnCoin", { y });

  const coin = this.coinsGroup.create(1080, y, "coin");

  if (!coin.texture || coin.texture.key === "__MISSING") {
    console.warn("[PakRunnerGame] coin asset missing, using fallback circle");
    coin.destroy();

    const circ = this.sceneRef.add.circle(1080, y, 16, 0xfacc15);
    this.sceneRef.physics.add.existing(circ);
    circ.body.setVelocityX(-this.worldSpeed);
    circ.body.setAllowGravity(false);
    this.coinsGroup.add(circ);
    return;
  }

  coin.setDisplaySize(28, 28);
  coin.body.setVelocityX(-this.worldSpeed);
  coin.body.setAllowGravity(false);
}

  update(scene, time, delta) {
    if (!this.player) return;

    this.score += delta * 0.01;
    this.updateHud();

    this.cleanupOffscreen(this.hurdles);
    this.cleanupOffscreen(this.coinsGroup);

    const level = this.mic.getLevel();
    const decision = this.voice.classify(level, performance.now());

    this.hud.action.textContent = this.labelForAction(decision.action);

    if (decision.action !== "idle" && this.voice.canTrigger(decision.action, performance.now())) {
      console.log("[PakRunnerGame] action triggered", {
        action: decision.action,
        level,
        time: performance.now(),
      });
      this.applyAction(decision.action);
      this.voice.markTriggered(performance.now());
    }

    if (this.player.y > 680) {
      console.log("[PakRunnerGame] player fell below threshold -> gameOver");
      this.gameOver();
    }
  }

  applyAction(action) {
    const body = this.player.body;
    if (!body) return;

    console.log("[PakRunnerGame] applyAction", action);

    switch (action) {
      case "backward":
        body.setVelocityX(-80);
        break;
      case "forward":
        body.setVelocityX(140);
        break;
      case "jump":
        if (body.blocked.down) {
          body.setVelocityY(-460);
        }
        break;
      case "sprint":
        body.setVelocityX(260);
        break;
      case "longJump":
        if (body.blocked.down) {
          body.setVelocityX(220);
          body.setVelocityY(-560);
        }
        break;
    }
  }

  labelForAction(action) {
    const map = {
      idle: "Idle",
      backward: "Back",
      forward: "Forward",
      jump: "Jump",
      sprint: "Sprint",
      longJump: "Long Jump",
    };
    return map[action] || action;
  }

  cleanupOffscreen(group) {
    group.getChildren().forEach(child => {
      if (child.x < -100) {
        child.destroy();
      }
    });
  }

  updateHud() {
    if (!this.hud?.score || !this.hud?.coins || !this.hud?.best) {
      console.warn("[PakRunnerGame] HUD elements missing", this.hud);
      return;
    }

    this.hud.score.textContent = Math.floor(this.score);
    this.hud.coins.textContent = this.coins;
    this.hud.best.textContent = this.best;
  }

  gameOver() {
    if (!this.started) return;
    console.log("[PakRunnerGame] gameOver called");

    this.started = false;

    const finalScore = Math.floor(this.score);
    if (finalScore > this.best) {
      this.best = finalScore;
      localStorage.setItem("pak_runner_best_score", String(this.best));
      console.log("[PakRunnerGame] new best score", this.best);
    }

    this.updateHud();
    window.dispatchEvent(new CustomEvent("pak-runner-gameover", {
      detail: {
        score: finalScore,
        coins: this.coins,
        best: this.best,
      },
    }));

    this.game?.destroy(true);
    console.log("[PakRunnerGame] Phaser game destroyed");
  }
}