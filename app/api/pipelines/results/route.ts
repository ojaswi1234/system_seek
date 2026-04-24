import { NextResponse } from "next/server";
import dbConnect from "@/lib/db_connect";
import StressTestLogs from "@/lib/models/StressTestLogs";

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all logs and sort them by the most recently updated
    const logs = await StressTestLogs.find({}).sort({ updatedAt: -1 }).lean();
    
    return NextResponse.json({ success: true, results: logs });
  } catch (error) {
    console.error("[RESULTS FETCH ERROR]:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch logs" }, { status: 500 });
  }
}