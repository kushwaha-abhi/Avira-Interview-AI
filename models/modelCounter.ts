import mongoose, { Model, Schema } from "mongoose";

// Interface for the Counter document
interface ICounter {
  prefix: string;
  seq: number;
}

// Schema for the Counter model
const counterSchema = new Schema<ICounter>({
  prefix: { type: String, required: true, index: true },
  seq: { type: Number, default: 0 },
});

// Create the Counter model
const ModelCounter =
  (mongoose.models.ModelCounter as Model<ICounter>) ||
  mongoose.model<ICounter>("ModelCounter", counterSchema);
export default ModelCounter;

export async function generateUniqueSequence(prefix: string): Promise<number> {
  try {
    const counter = await ModelCounter.findOneAndUpdate(
      { prefix },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return counter.seq;
  } catch (error) {
    console.error("Error generating unique sequence:", error);
    throw new Error("Failed to generate unique sequence");
  }
}

export async function generateUniqueID(prefix: string): Promise<string> {
  try {
    const sequence = await generateUniqueSequence(prefix); // Use the prefix passed from the route definition
    const generatedId = `${prefix}${sequence.toString().padStart(5, "0")}`;
    console.log("Generated ID:", generatedId);
    return generatedId;
  } catch (error) {
    console.error("Error generating ID:", error);
    throw new Error(`${prefix}${Date.now()}`);
  }
}
