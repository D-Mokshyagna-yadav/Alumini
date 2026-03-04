import mongoose, { Document, Schema } from 'mongoose';

export interface IGalleryImage {
    _id?: mongoose.Types.ObjectId;
    url: string;
    type: 'image' | 'video';
    caption?: string;
    likes: mongoose.Types.ObjectId[];
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

export interface IGalleryAlbum extends Document {
    title: string;
    description?: string;
    folderName: string;
    coverImage?: string;
    images: IGalleryImage[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const GalleryImageSchema = new Schema<IGalleryImage>({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    caption: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const GalleryAlbumSchema = new Schema<IGalleryAlbum>({
    title: { type: String, required: true },
    description: { type: String },
    folderName: { type: String },
    coverImage: { type: String },
    images: [GalleryImageSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model<IGalleryAlbum>('GalleryAlbum', GalleryAlbumSchema);