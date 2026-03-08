import mongoose, { Document, Schema } from 'mongoose';

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface IPost extends Document {
    author: mongoose.Types.ObjectId;
    content: string;
    media: { type: 'image' | 'video'; url: string }[];
    likes: mongoose.Types.ObjectId[];
    comments: {
        author: mongoose.Types.ObjectId;
        text: string;
        createdAt: Date;
    }[];
    shares: number;
    visibility: 'public' | 'connections';
    status: PostStatus;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<IPost>({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    media: [{
        type: { type: String, enum: ['image', 'video'] },
        url: { type: String }
    }],
    visibility: { type: String, enum: ['public', 'connections'], default: 'public' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        text: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],
    shares: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IPost>('Post', postSchema);
