import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId; // For group messages
    sender: mongoose.Types.ObjectId;
    content: string; // Encrypted content
    iv: string; // Initialization vector for decryption
    media?: { type: string; url: string }[];
    type: 'text' | 'image' | 'video' | 'file';
    status: 'sent' | 'delivered' | 'read';
    deletedFor: mongoose.Types.ObjectId[]; // Users who deleted this message "for me"
    isDeletedForEveryone: boolean; // If true, message is deleted for all participants
    isEdited: boolean; // If true, message was edited
    editedAt?: Date; // When the message was last edited
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    iv: { type: String, required: true },
    media: [{ type: { type: String }, url: { type: String } }],
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file'], default: 'text' },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeletedForEveryone: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
}, { timestamps: true });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
