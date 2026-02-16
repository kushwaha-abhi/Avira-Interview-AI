import mongoose, { Model } from "mongoose";

export interface IDocumentModel {
  // documentId: string;
  userId: mongoose.Types.ObjectId;
  type: "Resume" | "JD";
  rawText?: string;
  parsed?: any;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new mongoose.Schema<IDocumentModel>(
  {
    // documentId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["Resume", "JD"], required: true },
    rawText: String,
    parsed: Object,
  },
  { timestamps: true }
);

const DocumentModel =
  (mongoose.models.DocumentModel as Model<IDocumentModel>) ||
  mongoose.model<IDocumentModel>("DocumentModel", DocumentSchema);

export default DocumentModel;
