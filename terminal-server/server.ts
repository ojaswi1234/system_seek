import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as pty from "node-pty";
import os from "os";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://expert-train-6p67vjvvjrpcr6gw-3000.app.github.dev"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function startServer() {
  io.on("connection", (socket) => {
    console.log("Secure Shell Session Started:", socket.id);

    let ptyProcess: pty.IPty | null = null;

    try {
      const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
      const customUser = socket.handshake.auth.username || "drift_user";
  
  console.log(`Secure Shell Session Started for: ${customUser}`);
      ptyProcess = pty.spawn(shell, ["--noprofile", "--norc"], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: {
          ...process.env,
         TERM: "dumb", // Keeps output clean from ANSI codes
    // This line overrides the prompt to match your desired format
    // \u is username, \w is working directory (we'll simplify to ~)
    PS1: "", // Set to empty string so only the frontend UI prompt shows
    // Tell bash not to read system profiles that might overwrite PS1
    BASH_ENV: "",
    ENV: "",
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

  httpServer.listen(3001, () => {
    console.log("Handyman Terminal running on port 3001");
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
