import fs from "node:fs";
import path from "node:path";

const targetFile = path.join(
  process.cwd(),
  "node_modules/.pnpm/next@15.5.15_react-dom@19.2.5_react@19.2.5__react@19.2.5/node_modules/next/dist/build/swc/index.js",
);

const before =
  "const importedRawBindings = await import((0, _url.pathToFileURL)(pkgPath).toString());";
const after =
  "const importedRawBindings = importPath ? await import((0, _url.pathToFileURL)(pkgPath).toString()) : await import(pkgPath);";

try {
  if (!fs.existsSync(targetFile)) {
    console.warn(`[patch-next-wasm] Target file not found: ${targetFile}`);
    process.exit(0);
  }

  const source = fs.readFileSync(targetFile, "utf8");

  if (source.includes(after)) {
    console.log("[patch-next-wasm] Patch already applied.");
    process.exit(0);
  }

  if (!source.includes(before)) {
    console.warn("[patch-next-wasm] Expected source snippet not found. Skipping patch.");
    process.exit(0);
  }

  fs.writeFileSync(targetFile, source.replace(before, after), "utf8");
  console.log("[patch-next-wasm] Applied Next swc-wasm import patch.");
} catch (error) {
  console.error("[patch-next-wasm] Failed to apply patch.", error);
  process.exit(1);
}
