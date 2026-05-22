import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db_connect';
import { AuditReport } from '@/lib/models/AuditReport';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    await dbConnect();
    const report = await AuditReport.findOne({ jobId }).lean();
    if (!report || !report.verifiedFindings) {
      return NextResponse.json({ status: 'pending' });
    }

    return NextResponse.json({ status: 'complete', report });
  } catch (err: any) {
    console.error('Status check failed', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
