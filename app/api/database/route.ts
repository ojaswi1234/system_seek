import dbConnect from "@/lib/db_connect";
import WebServer from "@/lib/models/WebServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  await dbConnect();
  const servers = await WebServer.find({});
  return Response.json(servers);
}

interface WebServerBody {
  [key: string]: unknown;
}

interface WebServerDocument extends WebServerBody {
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await dbConnect();
    const body: WebServerBody = await req.json();
    const webserver: WebServerDocument = await WebServer.create(body);
    return NextResponse.json(webserver);
  } catch (error) {
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
