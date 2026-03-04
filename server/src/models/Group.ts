import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
    name: string;
    description?: string;
    members: mongoose.Types.ObjectId[];
    admins: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}

const groupSchema = new Schema<IGroup>({
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    avatar: { type: String }
}, { timestamps: true });

export default mongoose.model<IGroup>('Group', groupSchema);
