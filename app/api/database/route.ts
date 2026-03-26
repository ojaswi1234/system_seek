/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/lib/db_connect";
import WebServer from "@/lib/models/WebServer";
import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";

export async function GET() {
  await dbConnect();
  const servers = await WebServer.find({});
  
  const serversWithData = await Promise.all(servers.map(async (server: any) => {
    const redisKey = `monitor:stats:${server._id}`;
    const stats = await redis.hgetall(redisKey);
    
    return {
      ...server.toObject(),
      status: stats.status || 'pending',
      reason: stats.reason || 'Redis Pending',
      latency: stats.latency ? parseInt(stats.latency) : 0,
      lastChecked: stats.lastChecked || server.updatedAt
    };
  }));

  return Response.json(serversWithData);
}

interface WebServerBody {
  [key: string]: unknown;
}

interface WebServerDocument extends WebServerBody {
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
  toObject(): any;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await dbConnect();
    const body: WebServerBody = await req.json();
    const webserver: WebServerDocument = await WebServer.create(body);

    // Trigger an initial ping without awaiting so it doesn't block the response
    // Use http://localhost for internal calls to avoid SSL issues with req.url behind proxies
    const port = process.env.PORT || 3000;
    fetch(`http://localhost:${port}/api/monitor/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: webserver._id }),
    }).catch(console.error);

    return NextResponse.json({
        ...webserver.toObject(),
        status: 'up',
        reason: 'Redis Pending',
        latency: 0
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "A web server with this URL already exists." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Database error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "ID is required" },
        { status: 400 }
      );
    }

    await WebServer.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


