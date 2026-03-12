import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string;
  type: 'register' | 'reset' | 'login' | 'email_verified';
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['register', 'reset', 'login', 'email_verified'], required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index – auto-delete when expired
}, { timestamps: true });

export default mongoose.model<IOTP>('OTP', otpSchema);
