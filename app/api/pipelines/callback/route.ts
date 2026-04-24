import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db_connect";
import StressTestLogs from "@/lib/models/StressTestLogs";

export async function POST(req: NextRequest) {
  try {
    // GCP will send the githubUrl and the final metrics to this endpoint
    const { githubUrl, metrics } = await req.json();
    
    if (!githubUrl || !metrics) {
        return NextResponse.json({ success: false, error: "Missing payload" }, { status: 400 });
    }

    // Connect to the database
    await dbConnect();
    
    // Find existing logs for this repo, or create a new one
    let logDoc = await StressTestLogs.findOne({ githubUrl });
    if (!logDoc) {
      logDoc = new StressTestLogs({ githubUrl, stressTests: [] });
    }

    // Safely save the metrics sent from GCP
    logDoc.stressTests.push({
      requestsPerSecond: metrics.requestsPerSecond,
      latencyAverage: metrics.latencyAverage,
      latency99th: metrics.latency99th || metrics.latency95th,
      successRate: metrics.successRate,
      totalRequests: metrics.totalRequests,
      testedAt: new Date()
    });

    await logDoc.save();

    return NextResponse.json({ success: true, message: "Metrics saved successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("[CALLBACK ERROR]:", error);
    return NextResponse.json({ success: false, error: "Database save failed" }, { status: 500 });
  }
}