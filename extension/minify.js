require("esbuild")
  .build({
    entryPoints: ["src/extension.ts"],
    outfile: "out/extension.js",
    external: ['vscode'],
    sourceRoot: "src",
    bundle: true,
    minify: true,
    platform: "node",
    loader: { ".ts": "ts" },
  })
  .then(() => console.log("⚡ Done"))
  .catch(() => process.exit(1));
