import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
    autoApproveUsers: boolean;
    autoApprovePosts: boolean;
    autoApproveJobs: boolean;
    autoApproveEvents: boolean;
    chatKey?: string;
}

const SiteSettingsSchema = new Schema<ISiteSettings>({
    autoApproveUsers: { type: Boolean, default: false },
    autoApprovePosts: { type: Boolean, default: false },
    autoApproveJobs: { type: Boolean, default: false },
    autoApproveEvents: { type: Boolean, default: false },
    chatKey: { type: String, select: false },
}, { timestamps: true });

// Singleton pattern – only one settings document should ever exist
const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);

/**
 * Always resolves to the single settings doc, creating one if absent.
 */
export async function getSettings(): Promise<ISiteSettings> {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = await SiteSettings.create({});
    }
    return settings;
}

export default SiteSettings;
