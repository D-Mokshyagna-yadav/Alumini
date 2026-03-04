import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const EmailSettings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAddEmail = async () => {
        if (!newEmail || !password) {
            toast.show('Please fill in all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post('/users/settings/email', { newEmail, password });
            toast.show('Email updated successfully', 'success');
            setNewEmail('');
            setPassword('');
            setTimeout(() => navigate('/settings'), 1000);
        } catch (error: any) {
            toast.show(error.response?.data?.error || 'Failed to update email', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-6"
            >
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Email Addresses</h1>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-[var(--bg-tertiary)]">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">Current Email</p>
                        <p className="font-medium text-[var(--text-primary)]">{user?.email}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            New Email Address
                        </label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email address"
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password to confirm"
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleAddEmail}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Updating...' : 'Update Email'}
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="px-6 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EmailSettings;
