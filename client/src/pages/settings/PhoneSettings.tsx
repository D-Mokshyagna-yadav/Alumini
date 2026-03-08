import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const PhoneSettings = () => {
    const navigate = useNavigate();
    const { user, checkAuth } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(user?.phone || '');

    const handleSave = async () => {
        if (!phone.trim()) {
            toast.show('Please enter a phone number', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.put('/users/profile', { phone: phone.trim() });
            await checkAuth();
            toast.show('Phone number updated successfully', 'success');
            setTimeout(() => navigate('/settings'), 1000);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.show(err.response?.data?.error || 'Failed to update phone number', 'error');
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
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Phone Number</h1>
                </div>

                <div className="space-y-6">
                    {user?.phone && (
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <p className="text-sm text-[var(--text-secondary)] mb-1">Current Phone</p>
                            <p className="font-medium text-[var(--text-primary)]">{user.phone}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            {user?.phone ? 'New Phone Number' : 'Phone Number'}
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Enter phone number"
                            className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PhoneSettings;
