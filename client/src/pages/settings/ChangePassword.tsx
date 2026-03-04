import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const ChangePassword = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChangePassword = async () => {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            toast.show('Please fill in all fields', 'error');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast.show('New passwords do not match', 'error');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.show('Password must be at least 6 characters', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post('/users/settings/password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });
            toast.show('Password changed successfully', 'success');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => navigate('/settings'), 1000);
        } catch (error: any) {
            toast.show(error.response?.data?.error || 'Failed to change password', 'error');
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Change Password</h1>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Current Password
                        </label>
                        <input
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Must be at least 6 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Changing...' : 'Change Password'}
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

export default ChangePassword;
