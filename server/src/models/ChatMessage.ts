import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  roadmapId: mongoose.Types.ObjectId;
  dayNumber: number;
  sender: 'user' | 'ai';
  text: string;
  createdAt: Date;
}

const ChatMessageSchema: Schema = new Schema({
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  dayNumber: { type: Number, required: true },
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
