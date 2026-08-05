import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const extensionRoot = resolve(projectRoot, "chrome-extension");
const outDir = resolve(extensionRoot, "dist");
const entries = ["background", "popup", "content"];

for (const [index, name] of entries.entries()) {
  await build({
    configFile: false,
    root: extensionRoot,
    publicDir: false,
    logLevel: "warn",
    build: {
      outDir,
      emptyOutDir: index === 0,
      minify: true,
      sourcemap: false,
      lib: {
        entry: resolve(extensionRoot, `${name}.ts`),
        name: `Tsunamaru${name[0].toUpperCase()}${name.slice(1)}`,
        formats: ["iife"],
        fileName: () => `${name}.js`,
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
}

await mkdir(resolve(extensionRoot, "assets"), { recursive: true });
await copyFile(
  resolve(projectRoot, "public/images/tsunamaru/tsunamaru-transparent.png"),
  resolve(extensionRoot, "assets/tsunamaru-transparent.png"),
);

console.log(`Chrome extension built: ${extensionRoot}`);
