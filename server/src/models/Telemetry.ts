import mongoose, { Document, Schema } from 'mongoose';

export interface ITelemetry extends Document {
    type: string;
    resourceType?: string;
    resourceId?: string;
    action: string;
    channel?: string;
    url?: string;
    user?: Schema.Types.ObjectId | string | null;
    ip?: string;
    createdAt: Date;
}

const telemetrySchema = new Schema<ITelemetry>({
    type: { type: String, required: true },
    resourceType: { type: String },
    resourceId: { type: String },
    action: { type: String, required: true },
    channel: { type: String },
    url: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String }
}, { timestamps: true });

export default mongoose.model<ITelemetry>('Telemetry', telemetrySchema);
