import mongoose, { Model, Schema } from "mongoose";

export interface IDailyUsage extends Document {
  userId: Schema.Types.ObjectId;
  questionsUsed: number;
  durationUsed: number; // seconds
  interviewsUsed: number;
  date: string; // "2025-01-07"
}

const DailyUsageSchema = new mongoose.Schema<IDailyUsage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  durationUsed: { type: Number, default: 0 },
  questionsUsed: { type: Number, default: 0 },
  interviewsUsed: { type: Number, default: 0 },
  date: { type: String },
});

const DailyUsage =
  (mongoose.models.DailyUsage as Model<IDailyUsage>) ||
  mongoose.model<IDailyUsage>("DailyUsage", DailyUsageSchema);

export default DailyUsage;
