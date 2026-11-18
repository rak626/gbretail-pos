// Build guard: a NEXT_PUBLIC_API_URL left in a local .env must never be baked
// into the browser bundle. Production calls the same-origin /api/* mount.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = ".next/static";
const absoluteUrl = /https?:\/\/localhost:\d+/;

async function jsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await jsFiles(path));
    else if (entry.name.endsWith(".js")) out.push(path);
  }
  return out;
}

const files = await jsFiles(root);
const offenders = [];
for (const file of files) {
  if (absoluteUrl.test(await readFile(file, "utf8"))) offenders.push(relative(process.cwd(), file));
}
if (offenders.length) {
  console.error(`Client bundle contains absolute localhost API URLs:\n  ${offenders.join("\n  ")}`);
  console.error("Remove NEXT_PUBLIC_API_URL from the build environment (local .env files are uploaded by Vercel CLI).");
  process.exit(1);
}
console.log(`Client bundle OK: no absolute localhost URLs (${files.length} JS files checked)`);
