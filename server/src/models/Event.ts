import mongoose from 'mongoose';
import { Document } from 'mongoose';

export enum EventStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export enum EventState {
    UPCOMING = 'upcoming',
    ONGOING = 'ongoing',
    COMPLETED = 'completed'
}

export interface IEvent extends Document {
    title: string;
    description: string;
    date: string;
    time?: string;
    venue?: string;
    bannerImage?: string;
    createdBy: mongoose.Types.ObjectId;
    attendees?: mongoose.Types.ObjectId[];
    attendeesCount?: number;
    isCompleted?: boolean;
    completedAt?: Date;
    status: EventStatus;
    eventState?: EventState;
    rejectionReason?: string;
    rejectedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new mongoose.Schema<IEvent>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String },
    venue: { type: String },
    bannerImage: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attendeesCount: { type: Number, default: 0 },
    // Mark event as completed (moved to completed tab)
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    status: { type: String, enum: Object.values(EventStatus), default: EventStatus.PENDING },
    eventState: { type: String, enum: Object.values(EventState), default: EventState.UPCOMING },
    rejectionReason: { type: String },
    rejectedAt: { type: Date, index: { expireAfterSeconds: 259200 } } // auto-delete 3 days after rejection
}, { timestamps: true });

const Event = mongoose.model<IEvent>('Event', EventSchema);

export default Event;
