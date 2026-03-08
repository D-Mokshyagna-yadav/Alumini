import mongoose, { Document, Schema } from 'mongoose';

export interface IAdministration extends Document {
    name: string;
    designation: string;
    category: 'governing' | 'officials';
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const AdministrationSchema = new Schema<IAdministration>(
    {
        name: { type: String, required: true, trim: true },
        designation: { type: String, required: true, trim: true },
        category: { type: String, required: true, enum: ['governing', 'officials'] },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model<IAdministration>('Administration', AdministrationSchema);
