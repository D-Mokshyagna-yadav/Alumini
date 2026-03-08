import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Bell, ChevronRight, Moon, Sun, User, Briefcase, Search, ShieldCheck, Eye } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('account');
    const { theme, mode, setTheme } = useTheme();
    const { user, checkAuth } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [jobProviderPref, setJobProviderPref] = useState(user?.jobProviderPreference || 'not_provider');
    const [jobSeekerPref, setJobSeekerPref] = useState(user?.jobSeekerPreference || 'active');
    const [savingPrefs, setSavingPrefs] = useState(false);

    const [emailVisibility, setEmailVisibility] = useState(user?.privacySettings?.emailVisibility || 'connections');
    const [phoneVisibility, setPhoneVisibility] = useState(user?.privacySettings?.phoneVisibility || 'connections');
    const [connectionsVisibility, setConnectionsVisibility] = useState(user?.privacySettings?.connectionsVisibility || 'everyone');
    const [savingPrivacy, setSavingPrivacy] = useState(false);

    const tabs = [
        { id: 'account', label: 'Account preferences', icon: User },
        { id: 'job-prefs', label: 'Job preferences', icon: Briefcase },
        { id: 'security', label: 'Sign in & security', icon: Lock },
        { id: 'privacy', label: 'Privacy', icon: Eye },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    const saveJobPreferences = async () => {
        setSavingPrefs(true);
        try {
            await api.put('/users/profile', {
                jobProviderPreference: jobProviderPref,
                jobSeekerPreference: jobSeekerPref,
            });
            await checkAuth();
            toast.show('Job preferences updated', 'success');
        } catch (err: any) {
            toast.show(err.response?.data?.error || 'Failed to save preferences', 'error');
        } finally {
            setSavingPrefs(false);
        }
    };

    const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">{title}</h3>
            <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                {children}
            </div>
        </div>
    );

    const SettingsItem = ({ label, value, onClick }: { label: string, value?: string, onClick?: () => void }) => (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
        >
            <span className="text-[var(--text-secondary)] font-medium">{label}</span>
            <div className="flex items-center gap-2">
                {value && <span className="text-[var(--text-muted)] text-sm">{value}</span>}
                <ChevronRight size={18} className="text-[var(--text-muted)]" />
            </div>
        </div>
    );

    return (
        <div className="max-w-[1128px] mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Mobile Tab Bar */}
            <div className="lg:hidden">
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 border-b border-[var(--border-color)]">
                        <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center overflow-hidden rounded-full flex-shrink-0">
                            <Avatar src={user?.avatar} iconSize={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-sm text-[var(--text-primary)] truncate">{user?.name || 'User'}</h2>
                            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email || ''}</p>
                        </div>
                    </div>
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === tab.id
                                    ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                    : 'border-b-2 border-transparent text-[var(--text-secondary)]'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-[300px] flex-shrink-0">
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden sticky top-24">
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="relative w-16 h-16 mx-auto mb-3">
                            <div className="w-16 h-16 bg-[var(--accent)] flex items-center justify-center overflow-hidden rounded-full">
                                <Avatar src={user?.avatar} iconSize={28} />
                            </div>
                        </div>
                        <h2 className="text-center font-semibold text-[var(--text-primary)]">{user?.name || 'User'}</h2>
                        <p className="text-center text-sm text-[var(--text-muted)]">{user?.email || ''}</p>
                    </div>
                    <div>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'border-l-4 border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                    : 'border-l-4 border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                    }`}
                            >
                                <tab.icon size={20} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <SettingsSection title="Profile Information">
                                <SettingsItem 
                                    label="Name, location, and industry" 
                                    value={user?.name || ''} 
                                    onClick={() => navigate('/settings/account-info')}
                                />
                            </SettingsSection>

                            <SettingsSection title="Display">
                                <div className="p-4">
                                    <h4 className="font-medium text-[var(--text-primary)] mb-4">Theme</h4>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTheme('auto')}
                                            className={`relative flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'auto' ? 'border-[var(--accent)] bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'}`}
                                        >
                                            {mode === 'auto' ? (
                                                <div className="mx-auto mb-2 w-6 h-6 flex items-center justify-center">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[var(--accent)] text-[var(--bg-primary)] rounded-md font-bold text-xs">A</span>
                                                </div>
                                            ) : theme === 'light' ? (
                                                <Sun className="mx-auto mb-2 w-6 h-6 text-[var(--text-muted)]" />
                                            ) : (
                                                <Moon className="mx-auto mb-2 w-6 h-6 text-[var(--text-muted)]" />
                                            )}
                                            <p className="text-center text-sm font-medium text-[var(--text-primary)]">Automatic</p>
                                        </button>
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'light' ? 'border-[var(--accent)] bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'}`}
                                        >
                                            <Sun className={`mx-auto mb-2 ${mode === 'light' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                            <p className="text-center text-sm font-medium text-[var(--text-primary)]">Light</p>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'dark' ? 'border-[var(--accent)] bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]' : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'}`}
                                        >
                                            <Moon className={`mx-auto mb-2 ${mode === 'dark' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                            <p className="text-center text-sm font-medium text-[var(--text-primary)]">Dark</p>
                                        </button>
                                    </div>
                                </div>
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'job-prefs' && (
                        <div className="space-y-6">
                            {/* Status badges */}
                            <SettingsSection title="Status & Preferences">
                                <div className="p-5 space-y-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        {user?.isVerified !== false && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
                                                <ShieldCheck size={14} /> Verified
                                            </span>
                                        )}
                                        {jobProviderPref !== 'not_provider' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                <Briefcase size={14} /> Job Provider
                                            </span>
                                        )}
                                        {jobSeekerPref !== 'not_interested' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                                <Search size={14} /> Job Seeker
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)]">These preferences control your visibility in job-related features across the platform.</p>
                                </div>
                            </SettingsSection>

                            <SettingsSection title="Job Provider Role">
                                <div className="p-5 space-y-4">
                                    <p className="text-sm text-[var(--text-muted)]">Indicate whether you can provide job opportunities or referrals to fellow alumni.</p>
                                    <div className="grid gap-3">
                                        {([
                                            { value: 'provider', label: 'Job Provider', desc: 'I can directly post or share job openings' },
                                            { value: 'referrer', label: 'Referrer', desc: 'I can refer candidates at my company' },
                                            { value: 'not_provider', label: 'Not a Provider', desc: 'I\'m not currently providing jobs or referrals' },
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setJobProviderPref(opt.value)}
                                                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                                    jobProviderPref === opt.value
                                                        ? 'border-[var(--accent)] bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]'
                                                        : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
                                                }`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                    jobProviderPref === opt.value ? 'border-[var(--accent)]' : 'border-[var(--text-muted)]'
                                                }`}>
                                                    {jobProviderPref === opt.value && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{opt.label}</p>
                                                    <p className="text-sm text-[var(--text-muted)]">{opt.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </SettingsSection>

                            <SettingsSection title="Job Seeker Status">
                                <div className="p-5 space-y-4">
                                    <p className="text-sm text-[var(--text-muted)]">Let others know if you're open to new opportunities.</p>
                                    <div className="grid gap-3">
                                        {([
                                            { value: 'active', label: 'Actively Looking', desc: 'I\'m actively searching for new opportunities' },
                                            { value: 'casual', label: 'Open to Offers', desc: 'I\'m not actively looking but open to the right opportunity' },
                                            { value: 'not_interested', label: 'Not Looking', desc: 'I\'m not interested in new opportunities right now' },
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setJobSeekerPref(opt.value)}
                                                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                                    jobSeekerPref === opt.value
                                                        ? 'border-[var(--accent)] bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]'
                                                        : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
                                                }`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                    jobSeekerPref === opt.value ? 'border-[var(--accent)]' : 'border-[var(--text-muted)]'
                                                }`}>
                                                    {jobSeekerPref === opt.value && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{opt.label}</p>
                                                    <p className="text-sm text-[var(--text-muted)]">{opt.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </SettingsSection>

                            <div className="flex gap-3">
                                <button
                                    onClick={saveJobPreferences}
                                    disabled={savingPrefs}
                                    className="px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 rounded-xl"
                                >
                                    {savingPrefs ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <SettingsSection title="Account Access">
                                <SettingsItem 
                                    label="Email address" 
                                    value={user?.email || ''} 
                                    onClick={() => navigate('/settings/email')}
                                />
                                <SettingsItem 
                                    label="Phone number" 
                                    value={user?.phone || 'Not set'} 
                                    onClick={() => navigate('/settings/phone')}
                                />
                                <SettingsItem 
                                    label="Change password" 
                                    onClick={() => navigate('/settings/change-password')}
                                />
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <SettingsSection title="Notification Preferences">
                                <SettingsItem 
                                    label="Manage notifications" 
                                    value="Configure what you receive"
                                    onClick={() => navigate('/settings/notifications')}
                                />
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            <SettingsSection title="Who can see your contact info">
                                <div className="p-5 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email address visibility</label>
                                        <p className="text-xs text-[var(--text-muted)] mb-3">Choose who can see your email on your profile</p>
                                        <div className="flex flex-col gap-2">
                                            {(['everyone', 'connections', 'only_me'] as const).map(opt => (
                                                <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    emailVisibility === opt
                                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                                        : 'border-[var(--border-color)]/30 hover:bg-[var(--bg-tertiary)]'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="emailVisibility"
                                                        checked={emailVisibility === opt}
                                                        onChange={() => setEmailVisibility(opt)}
                                                        className="accent-[var(--accent)]"
                                                    />
                                                    <span className="text-sm text-[var(--text-primary)] font-medium">
                                                        {opt === 'everyone' ? 'Everyone' : opt === 'connections' ? 'Connections only' : 'Only me'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Phone number visibility</label>
                                        <p className="text-xs text-[var(--text-muted)] mb-3">Choose who can see your phone number on your profile</p>
                                        <div className="flex flex-col gap-2">
                                            {(['everyone', 'connections', 'only_me'] as const).map(opt => (
                                                <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    phoneVisibility === opt
                                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                                        : 'border-[var(--border-color)]/30 hover:bg-[var(--bg-tertiary)]'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="phoneVisibility"
                                                        checked={phoneVisibility === opt}
                                                        onChange={() => setPhoneVisibility(opt)}
                                                        className="accent-[var(--accent)]"
                                                    />
                                                    <span className="text-sm text-[var(--text-primary)] font-medium">
                                                        {opt === 'everyone' ? 'Everyone' : opt === 'connections' ? 'Connections only' : 'Only me'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-xs text-[var(--text-muted)] italic">Note: Admins can always see all contact information regardless of privacy settings.</p>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Connections list visibility</label>
                                        <p className="text-xs text-[var(--text-muted)] mb-3">Choose who can see your connections on your profile</p>
                                        <div className="flex flex-col gap-2">
                                            {(['everyone', 'connections', 'only_me'] as const).map(opt => (
                                                <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    connectionsVisibility === opt
                                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                                        : 'border-[var(--border-color)]/30 hover:bg-[var(--bg-tertiary)]'
                                                }`}>
                                                    <input
                                                        type="radio"
                                                        name="connectionsVisibility"
                                                        checked={connectionsVisibility === opt}
                                                        onChange={() => setConnectionsVisibility(opt)}
                                                        className="accent-[var(--accent)]"
                                                    />
                                                    <span className="text-sm text-[var(--text-primary)] font-medium">
                                                        {opt === 'everyone' ? 'Everyone' : opt === 'connections' ? 'Connections only' : 'Only me'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            setSavingPrivacy(true);
                                            try {
                                                await api.put('/users/profile', { privacySettings: { emailVisibility, phoneVisibility, connectionsVisibility } });
                                                await checkAuth();
                                                toast.show('Privacy settings saved', 'success');
                                            } catch {
                                                toast.show('Failed to save privacy settings', 'error');
                                            } finally {
                                                setSavingPrivacy(false);
                                            }
                                        }}
                                        disabled={savingPrivacy}
                                        className="px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {savingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
                                    </button>
                                </div>
                            </SettingsSection>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Settings;
