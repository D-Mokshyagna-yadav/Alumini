import mongoose, { Document, Schema } from 'mongoose';

export interface IEventPost extends Document {
    event: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    content: string;
    likes: mongoose.Types.ObjectId[];
    likesCount: number;
    comments: Array<{
        author: mongoose.Types.ObjectId;
        content: string;
        createdAt: Date;
    }>;
    commentsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const eventPostSchema = new Schema<IEventPost>({
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    comments: [{
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    commentsCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IEventPost>('EventPost', eventPostSchema);
