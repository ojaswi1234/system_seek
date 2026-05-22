#!/usr/bin/env node
const mongoose = require('mongoose');
const fetch = global.fetch || ((...args) => import('node-fetch').then(m => m.default(...args)));

async function run() {
  const repoUrl = process.env.REPO_URL;
  const caseFileText = process.env.CASE_FILE_TEXT || '';
  const jobId = process.env.JOB_ID;
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!repoUrl || !jobId) {
    console.error('Missing REPO_URL or JOB_ID');
    process.exit(1);
  }

  // Step 1: Maker / Analyst
  const makerResp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:3b',
      prompt: `You are an SRE auditor. Analyze ${repoUrl}. ${caseFileText ? `Focus on: ${caseFileText}` : ''}`,
      max_tokens: 2000
    })
  });
  const makerJson = await makerResp.json();
  const rawFindings = makerJson?.results?.[0]?.content || JSON.stringify(makerJson);

  // Step 2: Reviewer
  const reviewerResp = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:3b',
      prompt: `You are a Senior Security Architect. Review and verify the following findings:\n\n${rawFindings}\n\nReturn ONLY a JSON document describing confirmed issues and recommendations.`,
      max_tokens: 2000
    })
  });
  const reviewerJson = await reviewerResp.json();
  let verifiedFindings = reviewerJson?.results?.[0]?.content || JSON.stringify(reviewerJson);

  // store to MongoDB using mongoose
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const AuditReport = mongoose.models.AuditReport || mongoose.model('AuditReport', new mongoose.Schema({ repoUrl: String, caseFileText: String, rawFindings: String, verifiedFindings: String, jobId: String, createdAt: Date }));
  await AuditReport.create({ jobId, repoUrl, caseFileText, rawFindings, verifiedFindings, createdAt: new Date() });
  console.log('Audit saved for job', jobId);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
