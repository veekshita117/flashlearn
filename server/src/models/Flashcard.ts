import mongoose, { Schema, Document } from 'mongoose';

export interface IFlashcard extends Document {
  userId: mongoose.Types.ObjectId;
  roadmapId: mongoose.Types.ObjectId;
  dayNumber: number;
  front: string;
  back: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: Date;
  createdAt: Date;
}

const FlashcardSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  dayNumber: { type: Number, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  interval: { type: Number, default: 0 },
  repetition: { type: Number, default: 0 },
  efactor: { type: Number, default: 2.5 },
  nextReviewDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
