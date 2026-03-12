import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import CachedImage from '../components/CachedImage';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase, MapPin, Clock, Building2, DollarSign,
    Bookmark, ExternalLink, Search, Filter, Plus, ChevronDown, MoreHorizontal, Share2
} from 'lucide-react';
import ShareModal from '../components/ShareModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

interface Job {
    id: string | number;
    title: string;
    company: string;
    location: string;
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    mode: 'Remote' | 'On-site' | 'Hybrid';
    salary?: string;
    description: string;
    requirements: string[];
    image?: string;
    postedBy: { id?: string; name: string; batch?: number | null } | null;
    postedAt: string;
    applicants: number;
    isSaved?: boolean;
    hasApplied?: boolean;
    isCreator?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
}

const Jobs = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { user, isAuthenticated } = useAuth();
    const { on: onSocket } = useSocket();
    
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [jobViewFilter, setJobViewFilter] = useState<'all' | 'applied' | 'posted'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [locationSearch, setLocationSearch] = useState('');
    const [industrySearch, setIndustrySearch] = useState('');
    const [modeFilter, setModeFilter] = useState<string>('all');
    const [currencyFilter, setCurrencyFilter] = useState<string>('all');
    const [salaryTypeFilter, setSalaryTypeFilter] = useState<string>('all');
    const [salaryMin, setSalaryMin] = useState<string>('');
    const [salaryMax, setSalaryMax] = useState<string>('');
    const [skillsSearch, setSkillsSearch] = useState('');
    const [experienceFilter, setExperienceFilter] = useState<string>('all');
    const [experienceMin, setExperienceMin] = useState<string>('');
    const [showJobModal, setShowJobModal] = useState(false);
    const [newJob, setNewJob] = useState<Partial<Job>>({
        title: '', company: '', location: '', type: 'Full-time', mode: 'Remote', description: '', requirements: [], salary: undefined,
    });
    const [requirementsText, setRequirementsText] = useState<string>('');
    const [jobImage, setJobImage] = useState<File | null>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/jobs');
                const data = res.data;
                if (!mounted) return;
                setJobs((data.jobs || []));
            } catch (err) {
                console.error('Failed to load jobs', err);
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false };
    }, []);

    // Refetch jobs list
    const refetchJobs = useCallback(async () => {
        try {
            const res = await api.get('/jobs');
            setJobs(res.data.jobs || []);
        } catch { /* silent */ }
    }, []);

    // ── Real-time socket listeners ────────────────────────────────────
    useEffect(() => {
        const unsubs: (() => void)[] = [];
        unsubs.push(onSocket('job_created', () => { refetchJobs(); }));
        unsubs.push(onSocket('job_updated', () => { refetchJobs(); }));
        unsubs.push(onSocket('job_deleted', ({ jobId }: { jobId: string }) => {
            setJobs(prev => prev.filter(j => String(j.id) !== String(jobId)));
        }));
        return () => unsubs.forEach(fn => fn());
    }, [onSocket, refetchJobs]);

    const parseSalaryNumber = (s?: string) => {
        if (!s) return NaN;
        const m = s.replace(/[,]/g, '').match(/\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : NaN;
    };

    const filteredJobs = jobs.filter(job => {
        // View filter: all, applied, or posted
        if (jobViewFilter === 'applied' && !job.hasApplied) return false;
        if (jobViewFilter === 'posted' && !job.isCreator) return false;
        
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.company.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesOpenOnly = !showOpenOnly || (job as any).isOpen !== false;
        const matchesType = typeFilter === 'all' || job.type === typeFilter;
        const matchesLocation = !locationSearch || (job.location || '').toLowerCase().includes(locationSearch.toLowerCase());
        const matchesIndustry = !industrySearch || ((job as any).industry || '').toLowerCase().includes(industrySearch.toLowerCase());
        const matchesMode = modeFilter === 'all' || job.mode === modeFilter;
        const matchesCurrency = (() => {
            if (currencyFilter === 'all') return true;
            const s = (job.salary || '').toLowerCase();
            const currencyMap: Record<string, string[]> = {
                // common symbols and keywords to detect currencies in free-form salary strings
                USD: ['$', 'usd', 'us$'],
                EUR: ['€', 'eur'],
                GBP: ['£', 'gbp'],
                INR: ['₹', 'inr', 'rs', 'rs.'],
                JPY: ['¥', 'jpy', 'yen'],
                CNY: ['¥', 'cny', 'yuan', 'renminbi'],
                AUD: ['a$', 'aud'],
                CAD: ['c$', 'cad'],
                NZD: ['nz$', 'nzd'],
                SGD: ['s$', 'sgd'],
                HKD: ['hk$', 'hkd'],
                KRW: ['₩', 'krw', 'won'],
                RUB: ['₽', 'rub'],
                ZAR: ['r', 'zar'],
                BRL: ['r$', 'brl'],
                MXN: ['mx$', 'mxn'],
                THB: ['฿', 'thb'],
                VND: ['₫', 'vnd'],
                PHP: ['₱', 'php'],
                PKR: ['₨', 'pkr', 'rs'],
                LKR: ['₨', 'lkr', 'rs'],
                NPR: ['₨', 'npr', 'rs'],
                BDT: ['৳', 'bdt'],
                EGP: ['e£', 'egp', 'ج.م', 'e£'],
                AED: ['د.إ', 'aed'],
                SAR: ['﷼', 'sar'],
                QAR: ['ر.ق', 'qar'],
                KES: ['ksh', 'kes'],
                NGN: ['₦', 'ngn'],
                GHS: ['¢', 'ghs', 'gh₵'],
                ILS: ['₪', 'ils'],
                DKK: ['kr', 'dkk'],
                NOK: ['kr', 'nok'],
                SEK: ['kr', 'sek'],
                CHF: ['fr', 'chf'],
                PLN: ['zł', 'pln'],
                CZK: ['Kč', 'czk'],
                HUF: ['Ft', 'huf'],
                RSD: ['дин', 'rsd'],
                TRY: ['₺', 'try'],
                SARB: ['﷼'],
                RUB_alt: ['руб', 'rub']
            };
            const checks = currencyMap[currencyFilter as keyof typeof currencyMap] || [];
            if (checks.some(k => s.includes(k))) return true;
            if (s.includes(currencyFilter.toLowerCase())) return true;
            return false;
        })();
        const matchesSalaryType = salaryTypeFilter === 'all' || (job.salary || '').toLowerCase().includes(salaryTypeFilter.toLowerCase());
        let matchesSalaryRange = true;
        const val = parseSalaryNumber(job.salary);
        const min = salaryMin ? parseFloat(salaryMin) : NaN;
        const max = salaryMax ? parseFloat(salaryMax) : NaN;
        if (!isNaN(min) && !isNaN(val)) matchesSalaryRange = matchesSalaryRange && val >= min;
        if (!isNaN(max) && !isNaN(val)) matchesSalaryRange = matchesSalaryRange && val <= max;
        const matchesSkills = !skillsSearch || job.requirements.some(r => r.toLowerCase().includes(skillsSearch.toLowerCase()));
        const parseExperienceRange = (s?: string) => {
            if (!s) return NaN;
            // expect formats like "2-5 years" or "3-4 years"
            const m = String(s).match(/(\d+)\s*-\s*(\d+)/);
            if (m) return parseInt(m[1], 10);
            const single = String(s).match(/(\d+)\s*years?/);
            if (single) return parseInt(single[1], 10);
            return NaN;
        };

        const matchesExperience = (() => {
            if (experienceFilter === 'all') return true;
            const wExp = ((job as any).workExperience || '').toLowerCase();
            if (experienceFilter === 'fresher') {
                return wExp.includes('fresher');
            }
            // experienced
            if (experienceFilter === 'experienced') {
                // if job has explicit experienceRange, compare with experienceMin if provided
                if (experienceMin) {
                    const minReq = parseInt(experienceMin, 10);
                    const jobMin = parseExperienceRange((job as any).experienceRange || (job as any).workExperience || '');
                    if (!isNaN(jobMin)) return jobMin >= minReq;
                }
                return wExp.includes('experience') || !!(job as any).experienceRange;
            }
            return true;
        })();
        return matchesSearch && matchesOpenOnly && matchesType && matchesLocation && matchesIndustry && matchesMode && matchesCurrency && matchesSalaryType && matchesSalaryRange && matchesSkills && matchesExperience;
    });

    const handleSave = async (jobId: string | number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const job = jobs.find(j => j.id === jobId);
        try {
            if (job?.isSaved) {
                await api.delete(`/saved/unsave/${jobId}`);
                toast.show('Job unsaved', 'success');
            } else {
                await api.post(`/saved/save/${jobId}`);
                toast.show('Job saved', 'success');
            }
            setJobs(prev => prev.map(j =>
                j.id === jobId ? { ...j, isSaved: !j.isSaved } : j
            ));
        } catch (err) {
            console.error('Failed to save/unsave job', err);
        }
    };

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareJobId, setShareJobId] = useState<string | number>('');
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);
    const [providerPref, setProviderPref] = useState<'provider'|'referrer'|'not_provider'>('not_provider');
    const [seekerPref, setSeekerPref] = useState<'active'|'casual'|'not_interested'>('active');

    const loadPreferences = async () => {
        try {
            const res = await api.get('/jobs/preferences');
            const data = res.data || {};
            setProviderPref(data.jobProviderPreference || 'not_provider');
            setSeekerPref(data.jobSeekerPreference || 'active');
        } catch (e) {
            console.error('Failed to load preferences', e);
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {/* Header skeleton */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="space-y-2">
                            <div className="h-6 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3 w-56 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                            <div className="h-9 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-9 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                    </div>
                    <div className="border-t border-[var(--border-color)] pt-3 flex gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-8 w-24 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                        ))}
                    </div>
                </div>
                {/* Job cards grid skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                    <aside className="hidden lg:block">
                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-4 space-y-3">
                            <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-9 w-full rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                            ))}
                        </div>
                    </aside>
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-5 space-y-3">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                        <div className="h-3 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-6 w-16 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-6 w-16 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-6 w-20 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="h-3 w-full rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                <div className="h-3 w-3/4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Header */}
            <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Jobs</h1>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)]">Opportunities posted by MIC College of Technology alumni</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={async () => { await loadPreferences(); setShowPreferencesModal(true); }} className="px-3 sm:px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs sm:text-sm">Preferences</button>

                        {(user?.role === 'alumni' || user?.role === 'admin') && (
                        <button onClick={() => navigate('/jobs/post')} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:bg-[var(--accent-hover)] transition-colors text-xs sm:text-sm">
                            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                            <span className="hidden sm:inline">Post Opportunity</span>
                            <span className="sm:hidden">Post</span>
                        </button>
                        )}
                    </div>
                </div>

                {/* Job View Filter Tabs */}
                <div className="flex items-center gap-2 border-t border-[var(--border-color)] pt-3 sm:pt-4 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setJobViewFilter('all')}
                        className={`flex-shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all ${
                            jobViewFilter === 'all'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                        All Jobs
                    </button>
                    <button
                        onClick={() => setJobViewFilter('applied')}
                        className={`flex-shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all ${
                            jobViewFilter === 'applied'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                        Jobs I Applied
                    </button>
                    <button
                        onClick={() => setJobViewFilter('posted')}
                        className={`flex-shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all ${
                            jobViewFilter === 'posted'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                    >
                        Jobs I Posted
                    </button>
                </div>
            </div>

            {/* Create Job Modal */}
            {showJobModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                    <div className="bg-[var(--bg-secondary)] w-full max-w-2xl overflow-hidden modal-content">
                        <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Post a Job</h2>
                            <button onClick={() => setShowJobModal(false)} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">X</button>
                        </div>

                        {jobImage && (
                            <div className="mb-4">
                                <img src={URL.createObjectURL(jobImage)} alt={newJob.company || 'job image'} className="w-full max-h-56 object-cover" />
                            </div>
                        )}
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Title</label>
                                <input value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} placeholder="Company" className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
                                <input value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} placeholder="Location" className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                                <textarea value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] h-28" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Type</label>
                                    <select value={newJob.type} onChange={e => setNewJob({ ...newJob, type: e.target.value as any })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mode</label>
                                    <select value={newJob.mode} onChange={e => setNewJob({ ...newJob, mode: e.target.value as any })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <option value="Remote">Remote</option>
                                        <option value="On-site">On-site</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Salary (optional)</label>
                                    <input value={newJob.salary || ''} onChange={e => setNewJob({ ...newJob, salary: e.target.value })} placeholder="e.g. ₹12 LPA" className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Requirements (comma separated)</label>
                                <input value={requirementsText} onChange={e => setRequirementsText(e.target.value)} placeholder="e.g. React, TypeScript, 3+ years" className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)]" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Image (optional)</label>
                                <input type="file" accept="image/*" onChange={(e) => setJobImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)} className="w-full" />
                                {jobImage && (
                                    <img src={URL.createObjectURL(jobImage)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                            <button onClick={() => setShowJobModal(false)} className="px-4 py-2 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)]">Cancel</button>
                            <button onClick={async () => {
                                try {
                                    let imageUrl: string | undefined = undefined;

                                    if (jobImage) {
                                        const fd = new FormData();
                                        fd.append('image', jobImage);
                                        const up = await api.post('/upload/job-image', fd, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        imageUrl = up.data.relative || up.data.url;
                                    }

                                    // normalize requirements into array
                                    const requirementsArr = requirementsText.split(',').map(s => s.trim()).filter(Boolean);
                                    const payload = { ...newJob, image: imageUrl, requirements: requirementsArr } as any;
                                    const res = await api.post('/jobs', payload);
                                    if (res.status === 201) {
                                        setShowJobModal(false);
                                        setNewJob({ title: '', company: '', location: '', type: 'Full-time', mode: 'Remote', description: '', requirements: [], salary: undefined });
                                        setJobImage(null);
                                        toast.show(res.data.message || 'Job submitted for admin approval.', 'success');
                                        // Reload jobs list
                                        const refreshed = await api.get('/jobs');
                                        setJobs(refreshed.data.jobs || []);
                                    }
                                } catch (err: any) {
                                    if (err.response && err.response.status === 401) {
                                        toast.show('Please login to post a job', 'error');
                                    } else {
                                        console.error(err);
                                        toast.show(err.response?.data?.message || 'Failed to post job', 'error');
                                    }
                                }
                            }} className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium">Post Job</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preferences Modal */}
            {showPreferencesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                    <div className="bg-[var(--bg-secondary)] w-full max-w-3xl overflow-hidden modal-content">
                        <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">SET JOB PORTAL PREFERENCES</h2>
                            <button onClick={() => setShowPreferencesModal(false)} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">X</button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Your preferences as job provider? *</h3>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="provider" checked={providerPref==='provider'} onChange={() => setProviderPref('provider')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Job provider</div>
                                        <div className="text-sm text-[var(--text-muted)]">Would like to recruit new talent.</div>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="provider" checked={providerPref==='referrer'} onChange={() => setProviderPref('referrer')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Job referrer</div>
                                        <div className="text-sm text-[var(--text-muted)]">Would like to refer my organization's offers.</div>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="provider" checked={providerPref==='not_provider'} onChange={() => setProviderPref('not_provider')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Not interested as job provider</div>
                                    </div>
                                </label>
                            </div>

                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Your preferences as job seeker? *</h3>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="seeker" checked={seekerPref==='active'} onChange={() => setSeekerPref('active')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Actively applying for job</div>
                                        <div className="text-sm text-[var(--text-muted)]">Would like to receive regular notifications.</div>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="seeker" checked={seekerPref==='casual'} onChange={() => setSeekerPref('casual')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Casually looking for job</div>
                                        <div className="text-sm text-[var(--text-muted)]">Would like to receive periodic notifications only.</div>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 mb-3"><input type="radio" name="seeker" checked={seekerPref==='not_interested'} onChange={() => setSeekerPref('not_interested')} className="mt-1" />
                                    <div>
                                        <div className="font-medium">Not interested in job offers</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                            <button onClick={() => setShowPreferencesModal(false)} className="px-4 py-2 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)]">Cancel</button>
                            <button onClick={async () => {
                                try {
                                    await api.post('/jobs/preferences', { jobProviderPreference: providerPref, jobSeekerPreference: seekerPref });
                                    toast.show('Preferences saved', 'success');
                                    setShowPreferencesModal(false);
                                } catch (err: any) {
                                    console.error(err);
                                    toast.show(err.response?.data?.message || 'Failed to save preferences', 'error');
                                }
                            }} className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                {/* Left: Filters */}
                <div className="space-y-4">
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Filters</h3>
                        <div className="space-y-4">
                            {/* Search by company, title */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Search by company, title</label>
                                <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
                                    <Search size={16} className="text-[var(--text-muted)]" />
                                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent w-full text-sm text-[var(--text-primary)] focus:outline-none !border-none !shadow-none !ring-0 !rounded-none" />
                                </div>
                            </div>

                            {/* Show open opportunities only */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showOpen"
                                    checked={showOpenOnly}
                                    onChange={(e) => setShowOpenOnly(e.target.checked)}
                                    className="w-4 h-4 text-[var(--accent)]"
                                />
                                <label htmlFor="showOpen" className="text-sm text-[var(--text-primary)]">Show open opportunities only</label>
                            </div>

                            {/* Opportunity type */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Opportunity type</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="type" checked={typeFilter === 'all'} onChange={() => setTypeFilter('all')} className="w-4 h-4" />
                                        <span className="text-sm">All</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="type" checked={typeFilter === 'Full-time'} onChange={() => setTypeFilter('Full-time')} className="w-4 h-4" />
                                        <span className="text-sm">Full Time</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="type" checked={typeFilter === 'Internship'} onChange={() => setTypeFilter('Internship')} className="w-4 h-4" />
                                        <span className="text-sm">Internship</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="type" checked={typeFilter === 'Contract'} onChange={() => setTypeFilter('Contract')} className="w-4 h-4" />
                                        <span className="text-sm">Contractual / Freelance work</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="type" checked={typeFilter === 'Volunteer'} onChange={() => setTypeFilter('Volunteer')} className="w-4 h-4" />
                                        <span className="text-sm">Volunteer</span>
                                    </label>
                                </div>
                            </div>

                            {/* Locations */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Locations</label>
                                <input
                                    value={locationSearch}
                                    onChange={(e) => setLocationSearch(e.target.value)}
                                    placeholder="Search location"
                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm"
                                />
                            </div>

                            {/* Industry */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Industry</label>
                                <input
                                    value={industrySearch}
                                    onChange={(e) => setIndustrySearch(e.target.value)}
                                    placeholder="Search industry"
                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm"
                                />
                            </div>

                            {/* Workplace type */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Workplace type</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="mode" checked={modeFilter === 'all'} onChange={() => setModeFilter('all')} className="w-4 h-4" />
                                        <span className="text-sm">All</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="mode" checked={modeFilter === 'On-site'} onChange={() => setModeFilter('On-site')} className="w-4 h-4" />
                                        <span className="text-sm">On-site / Work from office</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="mode" checked={modeFilter === 'Remote'} onChange={() => setModeFilter('Remote')} className="w-4 h-4" />
                                        <span className="text-sm">Remote / Work from home</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="mode" checked={modeFilter === 'Hybrid'} onChange={() => setModeFilter('Hybrid')} className="w-4 h-4" />
                                        <span className="text-sm">Hybrid</span>
                                    </label>
                                </div>
                            </div>

                            {/* Salary */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Salary</label>
                                <div className="space-y-2">
                                    <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm">
                                        <option value="all">All Currencies</option>
                                        <option value="AED">AED - UAE Dirham (د.إ)</option>
                                        <option value="AFN">AFN - Afghan Afghani</option>
                                        <option value="ALL">ALL - Albanian Lek</option>
                                        <option value="AMD">AMD - Armenian Dram</option>
                                        <option value="ANG">ANG - Netherlands Antillean Guilder</option>
                                        <option value="AOA">AOA - Angolan Kwanza</option>
                                        <option value="ARS">ARS - Argentine Peso</option>
                                        <option value="AUD">AUD - Australian Dollar (A$)</option>
                                        <option value="AWG">AWG - Aruban Florin</option>
                                        <option value="AZN">AZN - Azerbaijani Manat</option>
                                        <option value="BAM">BAM - Bosnia-Herzegovina Convertible Mark</option>
                                        <option value="BBD">BBD - Barbadian Dollar</option>
                                        <option value="BDT">BDT - Bangladeshi Taka (৳)</option>
                                        <option value="BGN">BGN - Bulgarian Lev</option>
                                        <option value="BHD">BHD - Bahraini Dinar</option>
                                        <option value="BIF">BIF - Burundian Franc</option>
                                        <option value="BMD">BMD - Bermudan Dollar</option>
                                        <option value="BND">BND - Brunei Dollar</option>
                                        <option value="BOB">BOB - Bolivian Boliviano</option>
                                        <option value="BRL">BRL - Brazilian Real (R$)</option>
                                        <option value="BSD">BSD - Bahamian Dollar</option>
                                        <option value="BTN">BTN - Bhutanese Ngultrum</option>
                                        <option value="BWP">BWP - Botswanan Pula</option>
                                        <option value="BYN">BYN - Belarusian Ruble</option>
                                        <option value="BZD">BZD - Belize Dollar</option>
                                        <option value="CAD">CAD - Canadian Dollar (C$)</option>
                                        <option value="CDF">CDF - Congolese Franc</option>
                                        <option value="CHF">CHF - Swiss Franc</option>
                                        <option value="CLP">CLP - Chilean Peso</option>
                                        <option value="CNY">CNY - Chinese Yuan (¥)</option>
                                        <option value="COP">COP - Colombian Peso</option>
                                        <option value="CRC">CRC - Costa Rican Colón (₡)</option>
                                        <option value="CUP">CUP - Cuban Peso</option>
                                        <option value="CVE">CVE - Cape Verdean Escudo</option>
                                        <option value="CZK">CZK - Czech Republic Koruna (Kč)</option>
                                        <option value="DKK">DKK - Danish Krone (kr)</option>
                                        <option value="DOP">DOP - Dominican Peso</option>
                                        <option value="DZD">DZD - Algerian Dinar</option>
                                        <option value="EGP">EGP - Egyptian Pound (E£)</option>
                                        <option value="ETB">ETB - Ethiopian Birr</option>
                                        <option value="EUR">EUR - Euro (€)</option>
                                        <option value="FJD">FJD - Fijian Dollar</option>
                                        <option value="FKP">FKP - Falkland Islands Pound</option>
                                        <option value="GBP">GBP - British Pound Sterling (£)</option>
                                        <option value="GEL">GEL - Georgian Lari</option>
                                        <option value="GHS">GHS - Ghanaian Cedi (GH₵)</option>
                                        <option value="HKD">HKD - Hong Kong Dollar (HK$)</option>
                                        <option value="HUF">HUF - Hungarian Forint (Ft)</option>
                                        <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
                                        <option value="ILS">ILS - Israeli New Sheqel (₪)</option>
                                        <option value="INR">INR - Indian Rupee (₹)</option>
                                        <option value="JPY">JPY - Japanese Yen (¥)</option>
                                        <option value="KES">KES - Kenyan Shilling (KSh)</option>
                                        <option value="KRW">KRW - South Korean Won (₩)</option>
                                        <option value="KWD">KWD - Kuwaiti Dinar</option>
                                        <option value="LKR">LKR - Sri Lankan Rupee (₨)</option>
                                        <option value="MAD">MAD - Moroccan Dirham</option>
                                        <option value="MVR">MVR - Maldivian Rufiyaa</option>
                                        <option value="MXN">MXN - Mexican Peso (Mex$)</option>
                                        <option value="MYR">MYR - Malaysian Ringgit (RM)</option>
                                        <option value="NPR">NPR - Nepalese Rupee (₨)</option>
                                        <option value="NZD">NZD - New Zealand Dollar (NZ$)</option>
                                        <option value="NOK">NOK - Norwegian Krone (kr)</option>
                                        <option value="PHP">PHP - Philippine Peso (₱)</option>
                                        <option value="PKR">PKR - Pakistani Rupee (₨)</option>
                                        <option value="PLN">PLN - Polish Zloty (zł)</option>
                                        <option value="RON">RON - Romanian Leu (lei)</option>
                                        <option value="RUB">RUB - Russian Ruble (₽)</option>
                                        <option value="SAR">SAR - Saudi Riyal (﷼)</option>
                                        <option value="SEK">SEK - Swedish Krona (kr)</option>
                                        <option value="SGD">SGD - Singapore Dollar (S$)</option>
                                        <option value="THB">THB - Thai Baht (฿)</option>
                                        <option value="TRY">TRY - Turkish Lira (₺)</option>
                                        <option value="TWD">TWD - New Taiwan Dollar (NT$)</option>
                                        <option value="USD">USD - United States Dollar ($)</option>
                                        <option value="VND">VND - Vietnamese Dong (₫)</option>
                                        <option value="ZAR">ZAR - South African Rand (R)</option>
                                    </select>
                                    <select value={salaryTypeFilter} onChange={e => setSalaryTypeFilter(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm">
                                        <option value="all">All Salary Types</option>
                                        <option value="per year">per year</option>
                                        <option value="per month">per month</option>
                                        <option value="per day">per day</option>
                                        <option value="per hour">per hour</option>
                                    </select>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)]">Min salary</label>
                                        <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="Enter amount" className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm" />
                                    </div>
                                    <div className="text-center text-[var(--text-secondary)]">-</div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-[var(--text-secondary)]">Max salary</label>
                                        <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="Enter amount" className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Skills</label>
                                <input
                                    value={skillsSearch}
                                    onChange={(e) => setSkillsSearch(e.target.value)}
                                    placeholder="Search by skills name"
                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm"
                                />
                            </div>

                            {/* Work experience */}
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Work experience</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="experience" checked={experienceFilter === 'all'} onChange={() => setExperienceFilter('all')} className="w-4 h-4" />
                                        <span className="text-sm">All</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="experience" checked={experienceFilter === 'fresher'} onChange={() => setExperienceFilter('fresher')} className="w-4 h-4" />
                                        <span className="text-sm">Fresher</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" name="experience" checked={experienceFilter === 'experienced'} onChange={() => setExperienceFilter('experienced')} className="w-4 h-4" />
                                        <span className="text-sm">Experienced</span>
                                    </label>
                                    {experienceFilter === 'experienced' && (
                                        <div className="mt-2">
                                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Minimum years</label>
                                            <select value={experienceMin} onChange={e => setExperienceMin(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm">
                                                <option value="">Any</option>
                                                {[0,1,2,3,4,5,6,7,8,9,10,12,15,20].map(y => (
                                                    <option key={y} value={String(y)}>{y} years</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowOpenOnly(false);
                                    setTypeFilter('all');
                                    setLocationSearch('');
                                    setIndustrySearch('');
                                    setModeFilter('all');
                                    setCurrencyFilter('all');
                                    setSalaryTypeFilter('all');
                                    setSalaryMin('');
                                    setSalaryMax('');
                                    setSkillsSearch('');
                                    setExperienceFilter('all');
                                }}
                                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-sm font-medium"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Job List */}
                <div className="space-y-3">
                    <div className="text-sm text-[var(--text-secondary)] mb-4">Showing {filteredJobs.length} opportunities</div>
                    {filteredJobs.map((job) => (
                        <motion.div
                            key={job.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                            <div className="flex gap-3">
                                <div className="w-14 h-14 sm:w-20 sm:h-20 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {job.image ? (
                                        <CachedImage src={job.image} alt={job.company} className="w-full h-full object-cover" wrapperClassName="w-full h-full" compact />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-[var(--bg-primary)] font-semibold text-lg">
                                            {job.company ? job.company.split(' ').map(s => s[0]).slice(0,2).join('') : <Building2 size={28} className="text-[var(--bg-primary)]" />}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                                    {job.status === 'pending' && job.isCreator && (
                                        <div className="mb-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 text-xs font-medium rounded-full inline-block">Pending admin approval</div>
                                    )}
                                    {job.status === 'rejected' && job.isCreator && (
                                        <div className="mb-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full inline-block">Rejected by admin</div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full">{job.location}</span>
                                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full">{job.type}</span>
                                        {job.salary && <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-full">{job.salary}</span>}
                                    </div>
                                    <h3 className="font-semibold text-[var(--text-primary)] truncate">{job.title}</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">{job.company}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Posted {new Date(job.postedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex flex-col items-end justify-between flex-shrink-0">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }} 
                                        className={`px-3 sm:px-6 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ${
                                            job.hasApplied 
                                                ? 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]' 
                                                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                                        }`}
                                    >
                                        {job.hasApplied ? 'Unapply' : 'Apply'}
                                    </button>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={(e) => handleSave(job.id, e)} className="p-1.5 hover:bg-[var(--bg-tertiary)]">
                                            <Bookmark
                                                size={18}
                                                className={job.isSaved ? 'text-[var(--accent)] fill-current' : 'text-[var(--text-secondary)]'}
                                            />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setShareUrl(window.location.origin + `/jobs/${job.id}`); setShareJobId(job.id); setShowShareModal(true); }} className="p-1.5 hover:bg-[var(--bg-tertiary)]">
                                            <MoreHorizontal size={18} className="text-[var(--text-secondary)]" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Share Modal */}
            <ShareModal open={showShareModal} onClose={() => setShowShareModal(false)} url={shareUrl} resourceType="job" resourceId={String(shareJobId)} />
        </div>
    );
}

export default Jobs;
