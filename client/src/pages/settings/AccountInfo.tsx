import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const AccountInfo = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        headline: '',
        location: '',
        industry: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                headline: user.headline || '',
                location: user.currentLocation || '',
                industry: user.industry || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const response = await api.put('/users/profile', formData);
            toast.show('Profile information updated successfully', 'success');
            setTimeout(() => navigate('/settings'), 1000);
        } catch (error: any) {
            toast.show(error.response?.data?.error || 'Failed to update profile', 'error');
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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Name, Location, and Industry</h1>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Headline
                        </label>
                        <input
                            type="text"
                            value={formData.headline}
                            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                            placeholder="e.g., Software Engineer at Tech Company"
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Location
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g., New York, USA"
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Industry
                        </label>
                        <input
                            type="text"
                            value={formData.industry}
                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            placeholder="e.g., Technology, Finance, Healthcare"
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
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

export default AccountInfo;
