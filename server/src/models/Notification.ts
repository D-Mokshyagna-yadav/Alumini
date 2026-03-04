import mongoose, { Document } from 'mongoose';

export enum NotificationType {
    REGISTRATION_CONFIRMED = 'registration_confirmed',
    NEW_REGISTRATION = 'new_registration',
    EVENT_CANCELLED = 'event_cancelled',
    EVENT_COMPLETED = 'event_completed',
    EVENT_APPROVED = 'event_approved',
    EVENT_REJECTED = 'event_rejected',
    GENERAL = 'general',
    JOB_INTEREST = 'job_interest',
    JOB_INTEREST_CONFIRM = 'job_interest_confirm',
    JOB_CLOSED = 'job_closed',
    JOB_POSTED = 'job_posted',
    EVENT_POST_LIKE = 'event_post_like',
    EVENT_POST_COMMENT = 'event_post_comment',
    CONNECTION_REQUEST = 'connection_request',
    CONNECTION_ACCEPTED = 'connection_accepted',
    POST_LIKE = 'post_like',
    POST_COMMENT = 'post_comment',
    ACCOUNT_VERIFIED = 'account_verified'
}

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    actor?: mongoose.Types.ObjectId;
    type: NotificationType;
    message: string;
    data?: any;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.GENERAL },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
