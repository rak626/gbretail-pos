// Minimal Code 128-B barcode renderer (SVG). No runtime dependency: the POS
// already prints bill numbers, and a scannable barcode makes the receipt match
// the retail invoices cashiers are used to.

/** Code 128 bar/space width patterns for values 0–106 (106 = stop). */
const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;

/**
 * Encodes a value as Code 128-B symbols (start + data + checksum + stop).
 * Characters outside printable ASCII are dropped; an empty result means the
 * input cannot be encoded.
 */
export function code128Modules(value: string): boolean[] {
  const clean = Array.from(value).filter((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return code >= 32 && code <= 126;
  }).join("");
  if (!clean) return [];

  const data = Array.from(clean).map((ch) => (ch.codePointAt(0) ?? 32) - 32);
  const checksum = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  const values = [START_B, ...data, checksum, STOP];

  const modules: boolean[] = [];
  for (const v of values) {
    const pattern = CODE128_PATTERNS[v];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern.charAt(i));
      const isBar = i % 2 === 0;
      for (let w = 0; w < width; w++) modules.push(isBar);
    }
  }
  return modules;
}

/**
 * Renders a scannable Code 128-B barcode as an inline SVG.
 * `heightPx` is the visual height; width scales with the encoded payload.
 */
export function code128Svg(value: string, opts?: { heightPx?: number; moduleWidth?: number }): string {
  const modules = code128Modules(value);
  if (modules.length === 0) return "";

  const quiet = new Array<boolean>(QUIET_ZONE_MODULES).fill(false);
  const all = [...quiet, ...modules, ...quiet];
  const moduleWidth = opts?.moduleWidth ?? 1;
  const width = all.length * moduleWidth;
  const height = opts?.heightPx ?? 42;

  const rects: string[] = [];
  let runStart = -1;
  for (let i = 0; i <= all.length; i++) {
    const isBar = i < all.length && all[i] === true;
    if (isBar && runStart < 0) runStart = i;
    if (!isBar && runStart >= 0) {
      rects.push(
        `<rect x="${runStart * moduleWidth}" y="0" width="${(i - runStart) * moduleWidth}" height="${height}" fill="#000"/>`,
      );
      runStart = -1;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode ${value.replace(/[<>&"]/g, "")}">${rects.join("")}</svg>`;
}
