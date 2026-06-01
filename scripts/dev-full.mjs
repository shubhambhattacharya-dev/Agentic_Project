import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const processes = [
  {
    name: "api",
    command: npmCommand,
    args: ["run", "server:dev"],
  },
  {
    name: "web",
    command: npmCommand,
    args: ["run", "client:dev"],
  },
];

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped with signal ${signal}`);
      return;
    }

    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
