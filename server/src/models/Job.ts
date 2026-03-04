import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
    title: string;
    company: string;
    location: string;
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    mode: 'Remote' | 'On-site' | 'Hybrid';
    salary?: string;
    description: string;
    requirements: string[];
    image?: string; // relative path or full URL
    postedBy: mongoose.Types.ObjectId;
    applicants: number;
    applicantsList: Array<{ user: mongoose.Types.ObjectId; name: string; appliedAt: Date }>;
    isOpen: boolean;
    closedAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    industry?: string;
    workExperience?: string;
    experienceRange?: string;
    deadline?: string;
    companyDescription?: string;
    views?: number;
}

const jobSchema = new Schema<IJob>({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, enum: ['Full-time','Part-time','Contract','Internship'], default: 'Full-time' },
    mode: { type: String, enum: ['Remote','On-site','Hybrid'], default: 'Remote' },
    salary: { type: String },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    image: { type: String },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicants: { type: Number, default: 0 },
    applicantsList: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, name: String, appliedAt: { type: Date, default: Date.now } }],
    isOpen: { type: Boolean, default: true },
    closedAt: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    industry: { type: String },
    workExperience: { type: String },
    experienceRange: { type: String },
    deadline: { type: String },
    companyDescription: { type: String },
    views: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IJob>('Job', jobSchema);
