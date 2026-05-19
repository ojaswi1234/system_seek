import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as pty from "node-pty";
import dotenv from "dotenv";
import path from 'path';
import { execSync } from "child_process";
import { exec } from "child_process";

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
    execSync(`docker pull ${targetContainer}`, { stdio: 'ignore' });
    console.log("Docker image is cached and ready!");
  } catch (err) {
    console.error("Warning: Failed to pre-pull image. It will pull on first connection.", err);
  }

  io.on("connection", (socket) => {
    console.log("Secure Shell Session Started:", socket.id);
    let ptyProcess: pty.IPty | null = null;
    const containerName = `drift_shell_${socket.id}`;

    try {
      const customUser = socket.handshake.auth.username || "drift_user";
      const targetContainer = "alpine:latest";
      const REPOS_BASE_DIR = '/home/ubuntu/drift_repos'; 
      const repoName = "system_seek"; 
      const hostRepoPath = path.join(REPOS_BASE_DIR, repoName);
      const command = "docker";

     const args = [
  "run", "--rm", "-it", "--name", containerName, "--memory", "256m", "--cpus", "0.5",
  "-v", `${hostRepoPath}:/projects`,
  "-w", "/projects",
  "-e", "TERM=xterm-256color",
  "-e", "PROMPT_COMMAND=",  
  targetContainer, 
  "sh", 
  "-c", 
  "apk update && apk add --no-cache bash git openrc curl && sleep 2 && echo 'DRIFT_CLEAR_SCREEN' && echo 'PS1=\"\"' > ~/.bashrc && exec bash"
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
        exec(`docker rm -f ${containerName}`, (error, stdout, stderr) => {
          if (error) {
            console.log(`Container ${containerName} cleanup error (may have already exited): ${error.message}`);
          } else {
            console.log(`Successfully removed container ${containerName}`);
          }
        });
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

// --- CRITICAL FIX 1: Apply JSON parser globally ---
app.use(express.json());

app.post("/run-github-stress-test", (req, res) => {
  
  // --- CRITICAL FIX 2: Prevent the Node.js HTML Crash ---
  if (!req.body) {
    return res.status(400).json({ success: false, error: "Missing JSON body. This is usually caused by an HTTP -> HTTPS redirect dropping the payload." });
  }

  const { githubUrl } = req.body;
  if (!githubUrl || !githubUrl.startsWith("https://github.com/")) {
    return res.status(400).json({ error: "Invalid GitHub URL" });
  }

  // 1. Respond to Vercel IMMEDIATELY
  res.json({ success: true, message: "Pipeline started in background" });

  // 2. Run the heavy work in the background, SILENCING all logs except autocannon JSON
  // 2. Run the heavy work in the background, SILENCING all logs except autocannon JSON
  const command = `docker run --rm --memory="256m" --cpus="0.5" node:alpine sh -c "apk add --no-cache git > /dev/null 2>&1 && npm install -g autocannon > /dev/null 2>&1 && git clone ${githubUrl} /temp_app > /dev/null 2>&1 && cd /temp_app && npm install --legacy-peer-deps > /dev/null 2>&1 && npm run build --if-present > /dev/null 2>&1 && (npm start > /dev/null 2>&1 &) && sleep 15 && autocannon -c 50 -a 2000 -j http://localhost:3000"`;

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
    if (error) {
       console.error(`[STRESS ENGINE FATAL]`, stderr);
       return;
    }

    try {
      if (!stdout || stdout.trim() === '') {
        throw new Error('autocannon returned empty output');
      }

      // Find the first occurrence of '{' to ensure we only parse the clean JSON object
      const cleanStdout = stdout.substring(stdout.indexOf('{'));
      const stats = JSON.parse(cleanStdout) as any;
      
      console.log(`[DEBUG - PROOF OF LIFE] Autocannon successfully tested ${githubUrl}. Total Requests: ${stats.requests.sent}, Avg Latency: ${stats.latency.average}ms`);
      
      const totalReqs = stats.requests.sent || stats.requests.total || 0;
      const successReqs = stats['2xx'] || 0;
      
      const metrics = {
        totalRequests: totalReqs,
        successRate: totalReqs > 0 ? Number(((successReqs / totalReqs) * 100).toFixed(2)) : 0,
        latencyAverage: stats.latency.average,
        latency99th: stats.latency.p99,
        requestsPerSecond: stats.requests.average,
      };

      const targetVercelUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://drift-seek.vercel.app";
      
      await fetch(`${targetVercelUrl}/api/pipelines/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, metrics })
      })
      .then(res => {
         if (!res.ok) console.error("[STRESS ENGINE] Vercel rejected the callback payload.", res.status);
         else console.log(`[STRESS ENGINE] Results dispatched for ${githubUrl}. Data saved to MongoDB.`);
      })
      .catch(err => {
         console.error("[STRESS ENGINE FATAL] Could not reach Vercel API:", err.message);
      });

    } catch (parseError) {
      console.error(`[STRESS ENGINE JSON PARSE ERROR]`, parseError);
      console.error("RAW STDOUT:", stdout.substring(0, 200));
    }
  });
});