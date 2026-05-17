import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  username?: string;
  streakCount: number;
  lastActiveDate: Date | null;
  milestonesCompleted: number;
  totalQuizzesTaken: number;
  totalQuizScore: number;
  totalStudyMinutes: number;
  xp: number;
  createdAt: Date;
  isPublic: boolean;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  streakCount: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  milestonesCompleted: { type: Number, default: 0 },
  totalQuizzesTaken: { type: Number, default: 0 },
  totalQuizScore: { type: Number, default: 0 },
  totalStudyMinutes: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isPublic: { type: Boolean, default: true }
});

export default mongoose.model<IUser>('User', UserSchema);
