import mongoose, { Schema, Document } from 'mongoose';

export interface IRoadmap extends Document {
  userId: mongoose.Types.ObjectId;
  goal: string;
  roadmapData: any;
  notes: string;
  createdAt: Date;
}

const RoadmapSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, required: true },
  roadmapData: { type: Schema.Types.Mixed, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);
