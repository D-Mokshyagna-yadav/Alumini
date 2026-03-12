import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
    ALUMNI = 'alumni',
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin'
}

export enum UserStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    REJECTED = 'rejected'
}

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;

    // Academic Profile
    graduationYear: number;
    degree: string;
    department?: string;
    rollNumber: string; // Critical for verification

    // Professional / Personal (LinkedIn-like)
    headline?: string; // e.g., "Software Engineer at Google"
    industry?: string;
    phone?: string;
    currentLocation?: string;
    currentCompany?: string;
    designation?: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    isMentor?: boolean;
    savedPosts?: any[];

    // Extended profile fields
    experiences?: {
        id: string;
        title: string;
        company: string;
        location?: string;
        startDate: string;
        endDate?: string;
        current: boolean;
        description?: string;
    }[];
    education?: {
        id: string;
        school: string;
        degree: string;
        field?: string;
        startYear: number;
        endYear?: number;
        description?: string;
    }[];
    skills?: { id: string; name: string; endorsements: number }[];
    linkedinUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;

    isVerified: boolean;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    // Job portal preferences
    jobProviderPreference?: 'provider' | 'referrer' | 'not_provider';
    jobSeekerPreference?: 'active' | 'casual' | 'not_interested';
    
    // Notification preferences
    notificationPreferences?: {
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        jobAlerts?: boolean;
        eventReminders?: boolean;
        messageNotifications?: boolean;
        connectionRequests?: boolean;
        postLikes?: boolean;
        postComments?: boolean;
        weeklyDigest?: boolean;
    };

    // Privacy settings
    privacySettings?: {
        emailVisibility?: 'everyone' | 'connections' | 'only_me';
        phoneVisibility?: 'everyone' | 'connections' | 'only_me';
        connectionsVisibility?: 'everyone' | 'connections' | 'only_me';
    };

    profileViewers: mongoose.Types.ObjectId[];
    
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.ALUMNI },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING },

    graduationYear: { type: Number, required: true },
    degree: { type: String, required: true },
    department: { type: String },
    rollNumber: { type: String, required: true, unique: true },

    // LinkedIn-like profile fields
    headline: { type: String },
    industry: { type: String },
    phone: { type: String },
    currentLocation: { type: String },
    currentCompany: { type: String },
    designation: { type: String },
    avatar: { type: String },
    coverImage: { type: String },
    bio: { type: String },

    // Mentor flag - whether the user volunteered to be a mentor
    isMentor: { type: Boolean, default: false },

    // Extended profile fields
    experiences: [{
        id: { type: String },
        title: { type: String },
        company: { type: String },
        location: { type: String },
        startDate: { type: String },
        endDate: { type: String },
        current: { type: Boolean, default: false },
        description: { type: String }
    }],
    education: [{
        id: { type: String },
        school: { type: String },
        degree: { type: String },
        field: { type: String },
        startYear: { type: Number },
        endYear: { type: Number },
        description: { type: String }
    }],
    skills: [{
        id: { type: String },
        name: { type: String },
        endorsements: { type: Number, default: 0 }
    }],
    linkedinUrl: { type: String },
    githubUrl: { type: String },
    websiteUrl: { type: String },
    twitterUrl: { type: String },
    instagramUrl: { type: String },
    youtubeUrl: { type: String },

    // Saved posts by the user
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },

    profileViewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Job portal preferences
    jobProviderPreference: { type: String, enum: ['provider', 'referrer', 'not_provider'], default: 'not_provider' },
    jobSeekerPreference: { type: String, enum: ['active', 'casual', 'not_interested'], default: 'active' },
    
    // Notification preferences
    notificationPreferences: {
        type: {
            emailNotifications: { type: Boolean, default: true },
            pushNotifications: { type: Boolean, default: true },
            jobAlerts: { type: Boolean, default: true },
            eventReminders: { type: Boolean, default: true },
            messageNotifications: { type: Boolean, default: true },
            connectionRequests: { type: Boolean, default: true },
            postLikes: { type: Boolean, default: false },
            postComments: { type: Boolean, default: true },
            weeklyDigest: { type: Boolean, default: true },
        },
        default: {}
    },

    // Privacy settings
    privacySettings: {
        type: {
            emailVisibility: { type: String, enum: ['everyone', 'connections', 'only_me'], default: 'connections' },
            phoneVisibility: { type: String, enum: ['everyone', 'connections', 'only_me'], default: 'connections' },
            connectionsVisibility: { type: String, enum: ['everyone', 'connections', 'only_me'], default: 'everyone' },
        },
        default: { emailVisibility: 'connections', phoneVisibility: 'connections', connectionsVisibility: 'everyone' }
    },
}, { timestamps: true });

export default mongoose.model<IUser>('User', userSchema);
