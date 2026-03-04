import mongoose, { Document, Schema } from 'mongoose';

export enum ConnectionStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected'
}

export interface IConnection extends Document {
    requester: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    status: ConnectionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>({
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: Object.values(ConnectionStatus), default: ConnectionStatus.PENDING },
}, { timestamps: true });

// Ensure unique connection between two users
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model<IConnection>('Connection', connectionSchema);
