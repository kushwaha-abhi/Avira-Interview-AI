import mongoose, { Schema, Document, Model } from "mongoose";

// Transcript Schema
export interface ITranscript extends Document {
  transcriptId: String;
  interviewId: String;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const TranscriptSchema = new Schema<ITranscript>({
  transcriptId: { type: String, required: true, unique: true, index: true },
  interviewId: { type: String, ref: "Interview", required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Transcript =
  (mongoose.models.Transcript as Model<ITranscript>) ||
  mongoose.model<ITranscript>("Transcript", TranscriptSchema);

export default Transcript;
