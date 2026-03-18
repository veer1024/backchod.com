export class VoiceController {
  constructor() {
    this.noiseFloor = 0.01;
    this.lowThreshold = 0.03;
    this.mediumThreshold = 0.06;
    this.highThreshold = 0.11;

    this.lastActionTime = 0;
    this.lastBurstTime = 0;
    this.previousActive = false;
    this.currentBurstStart = 0;

    this.cooldowns = {
      backward: 160,
      forward: 120,
      jump: 350,
      sprint: 500,
      longJump: 500,
    };
  }

  setThresholds({ noiseFloor, lowThreshold, mediumThreshold, highThreshold }) {
    this.noiseFloor = noiseFloor;
    this.lowThreshold = lowThreshold;
    this.mediumThreshold = mediumThreshold;
    this.highThreshold = highThreshold;
  }

  classify(level, now) {
    const active = level > this.lowThreshold;

    if (!active) {
      this.previousActive = false;
      return { action: "idle", level };
    }

    if (active && !this.previousActive) {
      this.currentBurstStart = now;
    }

    const duration = now - this.currentBurstStart;
    const sinceLastBurst = now - this.lastBurstTime;

    let action = "idle";

    if (level >= this.highThreshold) {
      action = duration > 240 ? "longJump" : "jump";
    } else if (level >= this.mediumThreshold) {
      action = sinceLastBurst < 220 ? "sprint" : "forward";
    } else if (level >= this.lowThreshold) {
      action = "backward";
    }

    this.previousActive = true;
    return { action, duration, sinceLastBurst, level };
  }

  canTrigger(action, now) {
    const cooldown = this.cooldowns[action] ?? 150;
    return now - this.lastActionTime >= cooldown;
  }

  markTriggered(now) {
    this.lastActionTime = now;
    this.lastBurstTime = now;
  }
}