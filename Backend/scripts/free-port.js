import { execSync } from "node:child_process";

const port = Number(process.env.PORT || 5011);

const run = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();

const getPidsWindows = (targetPort) => {
  const output = run(`netstat -ano -p tcp | findstr :${targetPort}`);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /LISTENING/i.test(line))
    .map((line) => line.split(/\s+/).pop())
    .filter(Boolean)
    .filter((pid) => /^\d+$/.test(pid));
};

const getPidsUnix = (targetPort) => {
  const output = run(`lsof -ti tcp:${targetPort}`);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));
};

try {
  const pids = process.platform === "win32" ? getPidsWindows(port) : getPidsUnix(port);
  const uniquePids = [...new Set(pids)].filter((pid) => Number(pid) !== process.pid);

  if (uniquePids.length === 0) {
    console.log(`[dev] Port ${port} is free.`);
    process.exit(0);
  }

  for (const pid of uniquePids) {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`[dev] Stopped process ${pid} on port ${port}.`);
  }
} catch {
  console.log(`[dev] Port ${port} is free.`);
}
