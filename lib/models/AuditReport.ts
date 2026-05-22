import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAuditReport extends Document {
  repoUrl: string;
  caseFileText?: string;
  rawFindings: string;
  verifiedFindings: string;
  jobId?: string;
  createdAt: Date;
}

const AuditReportSchema: Schema = new Schema({
  repoUrl: { type: String, required: true },
  caseFileText: { type: String },
  jobId: { type: String, index: true },
  rawFindings: { type: String, required: true },
  verifiedFindings: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const AuditReport: Model<IAuditReport> =
  mongoose.models.AuditReport || mongoose.model<IAuditReport>('AuditReport', AuditReportSchema);
