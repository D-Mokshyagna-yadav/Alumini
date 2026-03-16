import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const NotificationPreferences = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState({
        jobAlerts: true,
        eventReminders: true,
        messageNotifications: true,
        connectionRequests: true,
        postLikes: false,
        postComments: true,
    });

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const response = await api.get('/users/settings/notifications');
            if (response.data) {
                setPreferences(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch notification preferences');
        }
    };

    const handleToggle = (key: keyof typeof preferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await api.patch('/users/settings/notifications', preferences);
            toast.show('Notification preferences updated successfully', 'success');
            setTimeout(() => navigate('/settings'), 1000);
        } catch (error: any) {
            toast.show(error.response?.data?.error || 'Failed to update preferences', 'error');
        } finally {
            setLoading(false);
        }
    };

    const ToggleItem = ({ label, description, isEnabled, onToggle }: {
        label: string;
        description: string;
        isEnabled: boolean;
        onToggle: () => void;
    }) => (
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] last:border-0">
            <div>
                <h4 className="font-medium text-[var(--text-primary)]">{label}</h4>
                <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${isEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-color)]'}`}
            >
                <div className={`w-4 h-4 bg-[var(--bg-primary)] rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

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
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notification Preferences</h1>
                </div>

                <div className="space-y-6">
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl overflow-hidden">
                        <ToggleItem
                            label="Job Alerts"
                            description="Get notified about new job opportunities"
                            isEnabled={preferences.jobAlerts}
                            onToggle={() => handleToggle('jobAlerts')}
                        />
                        <ToggleItem
                            label="Event Reminders"
                            description="Receive reminders for upcoming events"
                            isEnabled={preferences.eventReminders}
                            onToggle={() => handleToggle('eventReminders')}
                        />
                        <ToggleItem
                            label="Message Notifications"
                            description="Get notified when you receive new messages"
                            isEnabled={preferences.messageNotifications}
                            onToggle={() => handleToggle('messageNotifications')}
                        />
                        <ToggleItem
                            label="Connection Requests"
                            description="Get notified about new connection requests"
                            isEnabled={preferences.connectionRequests}
                            onToggle={() => handleToggle('connectionRequests')}
                        />
                        <ToggleItem
                            label="Post Likes"
                            description="Get notified when someone likes your post"
                            isEnabled={preferences.postLikes}
                            onToggle={() => handleToggle('postLikes')}
                        />
                        <ToggleItem
                            label="Post Comments"
                            description="Get notified when someone comments on your post"
                            isEnabled={preferences.postComments}
                            onToggle={() => handleToggle('postComments')}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Preferences'}
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

export default NotificationPreferences;
