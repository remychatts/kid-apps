/** Checks that generation audio respects gesture unlocking, shade and immediate muting. */
import test from "node:test";
import assert from "node:assert/strict";
import { generationTone, unlockSound, muteSound } from "../src/sound.ts";

test("audio waits for interaction, maps dark to low pitch, and honours mute", () => {
  const oscillators = [];
  const gains = [];
  /** Records scheduled gain values without accessing speakers. */
  function parameter() {
    return {
      value: 0,
      setTargetAtTime(value) {
        this.value = value;
      },
      setValueAtTime(value) {
        this.value = value;
      },
      linearRampToValueAtTime(value) {
        this.value = value;
      },
      exponentialRampToValueAtTime(value) {
        this.value = value;
      },
    };
  }
  /** Provides only the audio operations the lesson needs. */
  class FakeContext {
    currentTime = 0;
    state = "running";
    destination = {};
    resume() {
      return Promise.resolve();
    }
    createGain() {
      const gain = { gain: parameter(), connect() {}, disconnect() {} };
      gains.push(gain);
      return gain;
    }
    createOscillator() {
      const oscillator = {
        frequency: parameter(),
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
      oscillators.push(oscillator);
      return oscillator;
    }
  }
  globalThis.AudioContext = FakeContext;
  generationTone(0, false);
  assert.equal(oscillators.length, 0);
  unlockSound();
  generationTone(0, false);
  generationTone(1, false);
  assert.deepEqual(
    oscillators.map((oscillator) => oscillator.frequency.value),
    [110, 880],
  );
  generationTone(0.5, true);
  assert.equal(oscillators.length, 2);
  muteSound(true);
  assert.equal(gains[0].gain.value, 0);
  muteSound(false);
  assert.equal(gains[0].gain.value, 1);
  delete globalThis.AudioContext;
});
