import { build } from "esbuild";
import { transform } from "@formatjs/unplugin/transform";
import { messageCatalog as clientCatalog } from "@magichourhq/browser-client";
import { messageCatalog as designVideoCatalog } from "@magichourhq/design-video";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
process.chdir(dirname(fileURLToPath(import.meta.url)));
const idInterpolationPattern = "[sha512:contenthash:base64:6]";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  target: "es2022",
  format: "iife",
  minify: false,
  sourcemap: false,
  legalComments: "eof",
  outfile: "dist/app.js",
  plugins: [
    {
      name: "formatjs",
      setup(build) {
        build.onLoad({ filter: /\.tsx?$/, namespace: "file" }, async ({ path }) => {
          if (path.includes("/node_modules/")) return;
          const result = transform(await readFile(path, "utf8"), path, { idInterpolationPattern });
          if (result)
            return {
              contents: result.code,
              loader: path.endsWith(".tsx") ? "tsx" : "ts",
              resolveDir: dirname(path),
            };
        });
      },
    },
  ],
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
});
// The app's own messages. The packages' messages come from their catalogs.
const appMessages = join(await mkdtemp(join(tmpdir(), "magic-hour-canva-")), "app.json");
execFileSync(
  process.execPath,
  [
    "node_modules/@formatjs/cli/bin/formatjs",
    "extract",
    "src/**/*.{ts,tsx}",
    "--out-file",
    appMessages,
    "--id-interpolation-pattern",
    idInterpolationPattern,
  ],
  { stdio: "inherit" }
);
const messages = {
  ...JSON.parse(await readFile(appMessages, "utf8")),
  ...clientCatalog(),
  ...designVideoCatalog(),
};
await writeFile("dist/messages_en.json", JSON.stringify(messages, null, 2) + "\n");
// The Canva Developer Portal accepts one JS bundle. Inline its generated UI Kit CSS.
const css = await readFile("dist/app.css", "utf8");
const js = await readFile("dist/app.js", "utf8");
await writeFile(
  "dist/app.js",
  `(()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();\n${js}`
);
