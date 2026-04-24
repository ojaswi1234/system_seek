import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as pty from "node-pty";
import dotenv from "dotenv";
import path from 'path';
import { execSync } from "child_process";
import { exec } from "child_process";
//import os from "os";
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});



function startServer() {
  const targetContainer = "alpine:latest";
  
  console.log(`Pre-pulling ${targetContainer} to ensure clean terminal starts...`);
  try {
    // stdio: 'ignore' prevents the messy logs from printing to your PM2 logs
    execSync(`docker pull ${targetContainer}`, { stdio: 'ignore' });
    console.log("Docker image is cached and ready!");
  } catch (err) {
    console.error("Warning: Failed to pre-pull image. It will pull on first connection.", err);
  }


  io.on("connection", (socket) => {
    console.log("Secure Shell Session Started:", socket.id);

    let ptyProcess: pty.IPty | null = null;

    try {
      const shell =  "sh";
      const customUser = socket.handshake.auth.username || "drift_user";
  const targetContainer = "alpine:latest";
 

// The executable is now Docker, not bash
// Define where you are storing all cloned repos on your GCP VM
const REPOS_BASE_DIR = '/home/ubuntu/drift_repos'; 

// Example: If the repo name is "system_seek", 
// the path becomes "/home/ubuntu/drift_repos/system_seek"
const repoName = "system_seek"; // You should eventually get this from the frontend
const hostRepoPath = path.join(REPOS_BASE_DIR, repoName);

const command = "docker";

const args = [
  "run",
  "--rm",
  "-it",
  "--memory", "256m",
"--cpus", "0.5",
  // MOUNT: Link the host folder to the container's /projects folder
  "-v", `${hostRepoPath}:/projects`, 
  "-w", "/projects",
  "-e", "TERM=xterm-256color", // Use xterm-256color for better terminal support
  "-e", `PS1=DRIFT_SERVER_PROMPT|\\w> `,
  "-e", "PROMPT_COMMAND=",
  targetContainer, // The image name (e.g., "ubuntu:latest")
  "sh"
];
  console.log(`Secure Shell Session Started for: ${customUser}`);
      ptyProcess = pty.spawn(command, args, {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: {
          ...process.env,
          DRIFT_ENGINE_ACTIVE: "true",
        },
      });
    } catch (err) {
      console.error("Failed to spawn shell:", err);
      socket.emit("output", "\r\n[server] Failed to start shell.\r\n");
      socket.disconnect();
      return;
    }

    ptyProcess.onData((data) => {
      socket.emit("output", data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      socket.emit(
        "output",
        `\r\n[server] Shell exited (code=${exitCode}, signal=${signal}).\r\n`,
      );
    });

    socket.on("input", (data) => {
      try {
        ptyProcess?.write(data);
      } catch (err) {
        console.error("Failed to write to shell:", err);
      }
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    socket.on("disconnect", () => {
      console.log("Session Ended:", socket.id);
      try {
        ptyProcess?.kill();
      } catch (err) {
        console.error("Failed to kill shell process:", err);
      }
    });
  });

  const argv = process.argv.slice(2);
  const portArg = argv.indexOf('--port');
  const hostArg = argv.indexOf('--hostname');

  const port = portArg !== -1 && argv[portArg + 1] ? parseInt(argv[portArg + 1], 10) : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
  const hostname = hostArg !== -1 && argv[hostArg + 1] ? argv[hostArg + 1] : '0.0.0.0';


  httpServer.listen(port, hostname, () => {
    console.log(`Handyman Terminal running ....`);
  });
}

try {
  startServer();
} catch (err) {
  console.error("Error starting terminal server:", err);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});


app.get("/", (req, res) => {
  res.send("Handyman Terminal Server is running.");
});

app.post("/run-github-stress-test", express.json(), (req, res) => {
  const { githubUrl } = req.body;
  if (!githubUrl || !githubUrl.startsWith("https://github.com/")) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  // 1. Respond to Vercel IMMEDIATELY
  res.json({ success: true, message: "Pipeline started in background" });

  // 2. Run the heavy work in the background
  const command = `docker run --rm --memory="512m" --cpus="0.8" node:alpine sh -c "apk add --no-cache git && npm install -g autocannon && git clone ${githubUrl} /temp_app && cd /temp_app && npm install --legacy-peer-deps && (npm start &) && sleep 10 && autocannon -c 50 -a 2000 -j http://localhost:3000"`;

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
    if (error) {
       console.error(`[STRESS ENGINE FATAL]`, stderr);
       return; 
    }

    try {
      const stats = JSON.parse(stdout) as any;
      const metrics = {
        totalRequests: stats.requests.sent,
        successRate: Number(((stats['2xx'] / stats.requests.sent) * 100).toFixed(2)),
        latencyAverage: stats.latency.average,
        latency99th: stats.latency.p99,
        requestsPerSecond: stats.requests.average,
      };

      // 3. POST the results back to a NEW Vercel webhook or update DB directly
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/pipelines/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, metrics })
      });

    } catch (parseErr) {
      console.error("Failed to process background stats", parseErr);
    }
  });
});