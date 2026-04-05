import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type Redis from "ioredis";
import { Server as IOServer } from "socket.io";
import redis from "@/lib/redis";

type MonitorMetricPayload = {
  id: string;
  url: string;
  status: "up" | "down" | "online" | "offline" | "pending" | "error";
  latency: number;
  reason: string;
  lastChecked: string;
};

type SocketServer = HTTPServer & {
  io?: IOServer;
  redisSubscriber?: Redis;
  redisSubscriberReady?: boolean;
};

type ApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: SocketServer;
  };
};

const CHANNEL = "system_metrics";

function safeParseMetric(message: string): MonitorMetricPayload | null {
  try {
    const parsed = JSON.parse(message) as Partial<MonitorMetricPayload>;
    if (!parsed.id || !parsed.url || !parsed.status || parsed.latency === undefined) {
      return null;
    }

    return {
      id: String(parsed.id),
      url: String(parsed.url),
      status: parsed.status,
      latency: Number(parsed.latency),
      reason: String(parsed.reason ?? ""),
      lastChecked: String(parsed.lastChecked ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export default async function handler(
  _req: NextApiRequest,
  res: ApiResponseServerIO,
) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, {
      path: "/api/socketio",
      cors: {
        origin: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    const subscriber = redis.duplicate();
    await subscriber.subscribe(CHANNEL);

    subscriber.on("message", (channel, message) => {
      if (channel !== CHANNEL) {
        return;
      }

      const payload = safeParseMetric(message);
      if (!payload) {
        return;
      }

      io.emit("monitor:metric", payload);
    });

    subscriber.on("error", (error) => {
      console.error("Redis subscriber error:", error);
    });

    io.on("connection", (socket) => {
      socket.emit("monitor:ready", { connected: true });
    });

    res.socket.server.io = io;
    res.socket.server.redisSubscriber = subscriber;
    res.socket.server.redisSubscriberReady = true;
  }

  res.status(200).json({ ok: true, subscriberReady: !!res.socket.server.redisSubscriberReady });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
