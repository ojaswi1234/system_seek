import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import redisSubscriber from '@/lib/redis/subscriber';

interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');

    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    // Use the singleton subscriber client from lib/redis/subscriber.ts.
    // A subscribed Redis client cannot issue other commands, so it must be a
    // dedicated connection separate from the main redis client.
    redisSubscriber.subscribe('system_metrics', (err) => {
      if (err) {
        console.error(
          'Socket.io: Failed to subscribe to system_metrics channel:',
          err,
        );
        return;
      }
      console.log('Socket.io: Subscribed to Redis system_metrics channel');
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'system_metrics') {
        try {
          const data = JSON.parse(message);
          io.emit('metric_update', data);
        } catch (parseErr) {
          console.error('Socket.io: Error parsing Redis message:', parseErr);
        }
      }
    });

    res.socket.server.io = io;
    console.log('Socket.io server initialized');
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
