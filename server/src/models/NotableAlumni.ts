import mongoose, { Document, Schema } from 'mongoose';

export interface INotableAlumni extends Document {
    name: string;
    role: string;
    batch: string;
    image: string;
    profileId?: mongoose.Types.ObjectId; // links to a User on the platform
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const NotableAlumniSchema = new Schema<INotableAlumni>(
    {
        name: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true },
        batch: { type: String, required: true, trim: true },
        image: { type: String, required: true },
        profileId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model<INotableAlumni>('NotableAlumni', NotableAlumniSchema);
