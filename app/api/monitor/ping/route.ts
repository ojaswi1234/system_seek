/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db_connect';
import WebServer from '../../../../lib/models/WebServer';
import redis from '@/lib/redis';


async function calculateLatency(url: string): Promise<{ latency: number; status: 'up' | 'down'; reason: string }> {
  const start = performance.now();
  let status: 'up' | 'down' = 'down';
  let reason = '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, { 
      method: 'HEAD', 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      status = 'up';
    } else {
      reason = `HTTP Error: ${res.status} ${res.statusText}`;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    reason = error.name === 'AbortError' ? 'Timeout' : (error.message || 'Connection failed');
    console.error(`Ping error for ${url}:`, error);
  }
  const end = performance.now();
  return { latency: Math.round(end - start), status, reason };
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, url: reqUrl } = body;

    if (!id && !reqUrl) {
      return NextResponse.json({ error: 'Must provide id or url' }, { status: 400 });
    }

    let webServer;
    if (id) {
      webServer = await WebServer.findById(id);
    } else {
      webServer = await WebServer.findOne({ url: reqUrl });
    }

    if (!webServer) {
      return NextResponse.json({ error: 'Web server not found' }, { status: 404 });
    }

    const targetUrl = webServer.url;
    console.log(`Pinging ${targetUrl}...`);
    const { latency, status, reason } = await calculateLatency(targetUrl);
    console.log(`Ping result for ${targetUrl}: status=${status}, latency=${latency}ms, reason=${reason}`);

    const redisKey = `monitor:stats:${webServer._id}`;
    await redis.hset(redisKey, {
        status,
        latency,
        reason,
        lastChecked: new Date().toISOString()
    });
    // Set expiry if you want, e.g., 24 hours
    // await redis.expire(redisKey, 86400);

    // 2. Prepare response
    const responseData = webServer.toObject();
    responseData.status = status;
    responseData.latency = latency;
    responseData.reason = reason;
    // await webServer.save();

    return NextResponse.json({ message: 'Ping successful', data: responseData }, { status: 200 });
  } catch (error: any) {
    console.error('Ping API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
