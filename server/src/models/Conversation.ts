import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage: mongoose.Types.ObjectId;
    unreadCounts: Map<string, number>;
    isRequest: boolean;
    requestAcceptedAt?: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCounts: { type: Map, of: Number, default: {} },
    isRequest: { type: Boolean, default: false },
    requestAcceptedAt: { type: Date }
}, { timestamps: true });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
