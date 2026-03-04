import mongoose, { Document, Schema } from 'mongoose';

export interface INewsItem extends Document {
    title: string;
    link?: string;
    readers?: number;
    time?: string; // human-friendly (e.g., '2h ago')
    body?: string; // full article content (plain text or markdown)
    image?: string; // relative path stored e.g. /uploads/username/events/xyz.webp
    publishedAt?: Date;
    priority?: number; // higher = show first
    draft?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const newsItemSchema = new Schema<INewsItem>({
    title: { type: String, required: true },
    link: { type: String },
    readers: { type: Number, default: 0 },
    time: { type: String },
    image: { type: String },
    body: { type: String },
    publishedAt: { type: Date },
    priority: { type: Number, default: 0 },
    draft: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<INewsItem>('NewsItem', newsItemSchema);
