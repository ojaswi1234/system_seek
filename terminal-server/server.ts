import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as pty from 'node-pty';
import os from 'os';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "https://expert-train-6p67vjvvjrpcr6gw-3000.app.github.dev" } // Allow your Next.js dashboard
});

io.on('connection', (socket) => {
  console.log('Secure Shell Session Started:', socket.id);

  // 1. Spawn the shell (The Handyman)
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: {
    ...process.env,
    TERM: 'xterm-256color', // Ensures colors look right in your UI [cite: 51]
    DRIFT_ENGINE_ACTIVE: 'true'
  }
  });

  // 2. Handle Data: Server -> Browser
  ptyProcess.onData((data) => {
    socket.emit('output', data);
  });

  // 3. Handle Input: Browser -> Server
  socket.on('input', (data) => {
    ptyProcess.write(data);
  });

  socket.on('disconnect', () => {
    console.log('Session Ended');
    ptyProcess.kill(); // Clean up resources
  });
});

httpServer.listen(3001, () => console.log('Handyman Terminal running on port 3001'));