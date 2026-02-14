import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const entrypoint = resolve(projectRoot, "index.ts");
const envFile = resolve(projectRoot, ".env");

const args = ["bun", "run", `--env-file=${envFile}`, "--watch", entrypoint];

const child = Bun.spawn(args, {
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
process.on("exit", stopChild);

const exitCode = await child.exited;
process.exit(exitCode);
