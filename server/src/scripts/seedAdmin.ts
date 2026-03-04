import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User Schema (inline to avoid import issues)
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, enum: ['alumni', 'student', 'admin'], default: 'alumni' },
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    isVerified: { type: Boolean, default: false },
    graduationYear: Number,
    degree: String,
    department: String,
    rollNumber: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mokshyagna:Alumini@alumini.fibqsga.mongodb.net/?appName=Alumini');
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'd.mokshyagnayadav@gmail.com' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('   Email: d.mokshyagnayadav@gmail.com');
            // Update to admin role if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                existingAdmin.status = 'active';
                existingAdmin.isVerified = true;
                await existingAdmin.save();
                console.log('   ✅ Updated to admin role!');
            }
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password', salt);

        const admin = await User.create({
            name: 'Mokshyagna Yadav',
            email: 'd.mokshyagnayadav@gmail.com',
            passwordHash,
            role: 'admin',
            status: 'active',
            isVerified: true,
            graduationYear: 2020,
            degree: 'Administrator',
            department: 'IT',
            rollNumber: 'ADMIN002',
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Email:    d.mokshyagnayadav@gmail.com');
        console.log('   Password: password');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🚀 You can now login at http://localhost:5173/login');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
