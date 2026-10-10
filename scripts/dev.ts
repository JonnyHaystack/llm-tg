import { realpathSync } from "node:fs";

// `bun --watch` ignores imports outside its working directory, comparing
// resolved paths. Starting it from the project's resolved path keeps every
// import watched when the project is opened through a symlink, junction or
// subst drive.
const watcher = Bun.spawn(["bun", "--watch", "src/index.ts"], {
  cwd: realpathSync(process.cwd()),
  stdio: ["inherit", "inherit", "inherit"],
});

// Ctrl+C reaches the watcher straight from the terminal, so wait for it to
// stop; any other termination has to be passed on.
process.on("SIGINT", () => {});
process.on("SIGTERM", () => watcher.kill());

process.exitCode = await watcher.exited;
