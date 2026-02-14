import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const entrypoint = resolve(projectRoot, "index.ts");

const child = Bun.spawn(["bun", "run", "--watch", entrypoint], {
  cwd: projectRoot,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const stopChild = () => {
  child.kill();
};

process.on("SIGINT", stopChild);
process.on("SIGTERM", stopChild);

const exitCode = await child.exited;
process.exit(exitCode);
