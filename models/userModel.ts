import mongoose, { Model, Schema } from "mongoose";

// Transcript Schema
export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  USRID: string;
  name: string;
  email: string;
  role: string;
  experience: string;
  difficulty: string;
  language: string;
  userType: "FREE" | "PREMIUM" | "GUEST";
  limits: ILimits;
  googleId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILimits extends Document {
  durationUsed: number;
  lastResetDate: string;
  maxDurationPerDay: number;
}

const LimitsSchema = new mongoose.Schema<ILimits>(
  {
    durationUsed: { type: Number, default: 0 }, // seconds
    maxDurationPerDay: { type: Number, default: 1800 }, // 30 minutes in seconds
    lastResetDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    USRID: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: [true, "Name is required"] },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      // required: [true, "Email is required"],
      // unique: true,
    },
    googleId: { type: String },
    userType: {
      type: String,
      enum: ["GUEST", "FREE", "PREMIUM"],
      default: "GUEST",
    },
    role: String,
    experience: String,
    difficulty: String,
    language: String,
    limits: { type: LimitsSchema },
  },
  { timestamps: true }
);

const User =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
