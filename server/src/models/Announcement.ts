import mongoose, { Document, Schema } from 'mongoose';

export type AnnouncementTemplate = 'celebration' | 'festival' | 'event' | 'regards' | 'general' | 'custom';

export interface IAnnouncement extends Document {
    title: string;
    subtitle?: string;
    template?: AnnouncementTemplate;
    message?: string;
    image?: string;
    link?: string;
    ctaLabel?: string;
    ctaLink?: string;
    audienceMode?: 'all' | 'specific';
    recipientIds?: string[];
    readers?: number;
    publishedAt?: Date;
    priority?: number;
    draft?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
    {
        title: { type: String, required: true },
        subtitle: { type: String },
        template: { type: String, enum: ['celebration', 'festival', 'event', 'regards', 'general', 'custom'], default: 'general' },
        message: { type: String },
        image: { type: String },
        link: { type: String },
        ctaLabel: { type: String },
        ctaLink: { type: String },
        audienceMode: { type: String, enum: ['all', 'specific'], default: 'all' },
        recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        readers: { type: Number, default: 0 },
        publishedAt: { type: Date },
        priority: { type: Number, default: 0 },
        draft: { type: Boolean, default: false },
    },
    { timestamps: true }
);

announcementSchema.index({ draft: 1, priority: -1, publishedAt: -1, createdAt: -1 });
announcementSchema.index({ template: 1, draft: 1, publishedAt: -1 });
announcementSchema.index({ audienceMode: 1, draft: 1, createdAt: -1 });
announcementSchema.index(
    { title: 'text', subtitle: 'text', message: 'text' },
    {
        name: 'announcement_text_search_idx',
        weights: { title: 10, subtitle: 5, message: 3 },
    }
);

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);