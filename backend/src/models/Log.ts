// src/models/Log.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  eventType: "entry" | "exit" | "presence" | "room_status";
  count: number;
  isOccupied: boolean;
  message: string;
}

const LogSchema = new Schema<ILog>(
  {
    eventType: {
      type: String,
      enum: ["entry", "exit", "presence", "room_status"],
      required: true,
    },
    count: {
      type: Number,
      required: true,
      min: 0,
    },
    isOccupied: {
      type: Boolean,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // 🔥 auto: createdAt = time
  }
);

export default mongoose.model<ILog>("Log", LogSchema);