import mongoose, { Document, Model, Schema } from "mongoose";

export interface IQA {
  questionId: string;
  question: string;
  answer?: string;
  eval?: Schema.Types.Mixed;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInterviewSession extends Document {
  // interviewId: string;
  userId: mongoose.Types.ObjectId;
  resumeId?: mongoose.Types.ObjectId;
  jdId?: mongoose.Types.ObjectId;
  status: "pending" | "ongoing" | "completed";
  systemPrompt?: string;
  maxQuestion: number;
  currentQuestion: number;
  contextSummary?: string;
  qaHistory: IQA[];
  startedAt: Date;
  endedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const InterviewSessionSchema = new mongoose.Schema<IInterviewSession>(
  {
    // interviewId: { type: String, required: true, unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    jdId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    status: {
      type: String,
      enum: ["pending", "ongoing", "completed"],
      default: "pending",
    },
    systemPrompt: String,
    contextSummary: String,
    maxQuestion: { type: Number, default: 5 },

    currentQuestion: { type: Number, default: 0 },
    qaHistory: [
      {
        questionId: String,
        question: String,
        answer: String,
        eval: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date, default: new Date() },
    endedAt: Date,
  },
  { timestamps: true }
);

const InterviewModel =
  (mongoose.models.InterviewSession as Model<IInterviewSession>) ||
  mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);

export default InterviewModel;
