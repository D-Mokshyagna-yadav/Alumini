import mongoose, { Document, Schema } from 'mongoose';

export type PublicKey = 'branding' | 'home' | 'about';

export interface IPublicContent extends Document {
    key: PublicKey;
    data: any; // Flexible JSON structure for UI-driven content
    updatedAt: Date;
    createdAt: Date;
}

const publicContentSchema = new Schema<IPublicContent>({
    key: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model<IPublicContent>('PublicContent', publicContentSchema);
