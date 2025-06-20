require("esbuild")
  .build({
    entryPoints: ["src/cli.ts"],
    outfile: "ts-worksheet-cli.js",
    sourceRoot: "src",
    bundle: true,
    minify: true,
    platform: "node",
    loader: { ".ts": "ts" },
  })
  .then(() => console.log("⚡ Done"))
  .catch(() => process.exit(1));
