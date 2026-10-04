/** Adjusts bark HSV value independently of inherited moth colours and selection. */

/** Compresses value towards the midpoint by up to 5%, preserving hue and saturation. */
export function barkColour(shade: number, mismatch: number): string {
  const lightness = (23 + shade * 56) / 100;
  if (mismatch === 0) return `hsl(68 12% ${23 + shade * 56}%)`;
  // HSL hue 68° lies between yellow and green; convert to RGB before changing HSV value.
  const chroma = (1 - Math.abs(2 * lightness - 1)) * 0.12;
  const minimum = lightness - chroma / 2;
  const rgb = [minimum + chroma * (2 - 68 / 60), minimum + chroma, minimum];
  const value = Math.max(...rgb);
  const compressed = value + (0.5 - value) * 0.05 * mismatch;
  return `rgb(${rgb.map((channel) => (((channel * compressed) / value) * 255).toFixed(3)).join(" ")})`;
}
