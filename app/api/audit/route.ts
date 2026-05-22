export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db_connect';
import { AuditReport } from '@/lib/models/AuditReport';

// Define the expected payload schema strictly
const AuditPayloadSchema = z.object({
  repoUrl: z.string().url(),
  caseFileText: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 1. Parse and Validate the incoming JSON payload
    const body = await request.json();
    const parsedBody = AuditPayloadSchema.safeParse(body);
    
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid payload structure' },
        { status: 400 }
      );
    }

    const { repoUrl, caseFileText } = parsedBody.data;

    // Generate jobId and return immediately
    const jobId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

    // Dispatch GitHub workflow via REST API
    const GITHUB_PAT = process.env.GITHUB_PAT;
    const DISPATCH_REPO = process.env.GITHUB_DISPATCH_REPO || 'ojaswi1234/drift_seek';
    if (!GITHUB_PAT) {
      console.error('Missing GITHUB_PAT in environment');
    } else {
      const dispatchUrl = `https://api.github.com/repos/${DISPATCH_REPO}/actions/workflows/ai-auditor.yml/dispatches`;
      try {
        await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${GITHUB_PAT}`,
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: { repoUrl, caseFileText: caseFileText || '', jobId }
          })
        });
      } catch (err) {
        console.error('Failed to dispatch workflow', err);
      }
    }

    // Optionally create a placeholder record so polling can see a pending job (without findings)
    await dbConnect();
    await AuditReport.create({ repoUrl, caseFileText, rawFindings: '', verifiedFindings: '', jobId });

    return NextResponse.json({ status: 'processing', jobId });

  } catch (error: any) {
    console.error('[DRIFT_ENGINE] Dispatch Failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error during dispatch.' },
      { status: 500 }
    );
  }
}
