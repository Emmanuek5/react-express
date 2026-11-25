// Builds the browser client (single classic script) and the server (tsc).
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: ["src/client/index.ts"],
  outfile: "dist/client/rx.js",
  bundle: true,
  format: "iife",
  target: ["es2020", "chrome90", "firefox90", "safari15"],
  minify: true,
  sourcemap: true,
  define: { __RX_VERSION__: JSON.stringify(pkg.version) },
  legalComments: "none",
  logLevel: "info",
});

execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });
