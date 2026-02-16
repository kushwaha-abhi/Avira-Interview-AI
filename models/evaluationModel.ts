import mongoose, { Schema, Document } from "mongoose";
import { Model } from "mongoose";

// Evaluation Schema
export interface IEvaluation extends Document {
  // evaluationId: string;
  interviewId: mongoose.Types.ObjectId;
  communication: number;
  technicalDepth: number;
  problemSolving: number;
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    // evaluationId: { type: String, required: true, unique: true, index: true },
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: false,
    },
    communication: { type: Number, required: true, min: 0, max: 10 },
    technicalDepth: { type: Number, required: true, min: 0, max: 10 },
    problemSolving: { type: Number, required: true, min: 0, max: 10 },
    confidence: { type: Number, required: true, min: 0, max: 10 },
    summary: { type: String, required: true },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

const Evaluation =
  (mongoose.models.Evaluation as Model<IEvaluation>) ||
  mongoose.model<IEvaluation>("Evaluation", EvaluationSchema);

export default Evaluation;
