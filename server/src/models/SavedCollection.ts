import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedCollection extends Document {
    user: mongoose.Types.ObjectId;
    name: string;
    posts: mongoose.Types.ObjectId[];
    coverImage?: string;
    isDefault?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const savedCollectionSchema = new Schema<ISavedCollection>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    coverImage: { type: String },
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

savedCollectionSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model<ISavedCollection>('SavedCollection', savedCollectionSchema);
