/** Samples continuous orbit and framing paths in animation time. */
export type Framing = { stageHeight: number; stageRadius: number };
export type CameraPose = Framing & { angle: number };

/** Eases the ends of camera moves to avoid abrupt starts and stops. */
function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Orbits once per clip, widening before the action and returning to neutral framing. */
export function sampleCamera(
  neutral: Framing,
  clip: Framing,
  initial: CameraPose,
  time: number,
  duration: number,
  rotate: boolean,
): CameraPose {
  const progress = Math.max(0, Math.min(1, time / duration));
  const entrance = smooth(time / Math.min(0.5, duration / 4));
  const exit = smooth((duration - time) / Math.min(0.6, duration / 4));
  const amount = entrance * exit;
  return {
    angle: initial.angle + (rotate ? 2 * Math.PI * smooth(progress) : 0),
    stageHeight:
      neutral.stageHeight +
      (clip.stageHeight - neutral.stageHeight) * amount +
      (initial.stageHeight - neutral.stageHeight) * (1 - entrance),
    stageRadius:
      neutral.stageRadius +
      (clip.stageRadius - neutral.stageRadius) * amount +
      (initial.stageRadius - neutral.stageRadius) * (1 - entrance),
  };
}
