import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import { MapPin, Briefcase, Building2, DollarSign, Bookmark, MoreHorizontal, ChevronLeft } from 'lucide-react';
import ShareModal from '../components/ShareModal';
import Avatar from '../components/ui/Avatar';
import JobShareFloating from '../components/JobShareFloating';
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
    postedBy: { id?: string; name: string; batch?: number | null; avatar?: string | null } | null;
    postedAt: string;
    applicants: number;
    isSaved?: boolean;
    canViewApplicants?: boolean;
    hasApplied?: boolean;
    isCreator?: boolean;
}

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const toast = useToast();
    const { isAuthenticated, user } = useAuth();
    const { on: onSocket } = useSocket();

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchJob = useCallback(async (silent = false) => {
        if (!id) return;
        try {
            const res = await api.get(`/jobs/${id}`);
            setJob(res.data.job || res.data);
        } catch (err) {
            if (!silent) {
                console.error('Failed to load job', err);
                toast.show('Failed to load job details', 'error');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id]);

    const fetchApplicants = useCallback(async (silent = false) => {
        if (!id) return;
        if (!silent) setApplicantsLoading(true);
        try {
            const res = await api.get(`/jobs/${id}/applicants`);
            const raw = res.data.applicants || [];
            const normalized = (Array.isArray(raw) ? raw : []).map((a: any) => ({
                id: a.userId || a.user?._id || a.user,
                name: a.name || a.user?.name || 'Unknown',
                email: a.user?.email || '',
                batch: a.user?.graduationYear || 'Class of 2020',
                appliedAt: a.appliedAt || null,
                avatar: a.user?.avatar || null
            }));
            setApplicants(normalized);
        } catch (err) {
            if (!silent) console.error('Failed to load applicants', err);
        } finally {
            setApplicantsLoading(false);
        }
    }, [id]);

    // Initial load
    useEffect(() => {
        fetchJob();
    }, [fetchJob]);

    // Auto-load applicants when job is loaded and user can view them
    useEffect(() => {
        if (job?.canViewApplicants) {
            fetchApplicants();
        }
    }, [job?.canViewApplicants, fetchApplicants]);

    // Live polling every 15s for job data + applicants
    useEffect(() => {
        pollRef.current = setInterval(() => {
            fetchJob(true);
            if (job?.canViewApplicants) fetchApplicants(true);
        }, 15000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchJob, fetchApplicants, job?.canViewApplicants]);

    // ── Real-time socket listeners (instant updates on top of polling) ──
    useEffect(() => {
        const unsubs: (() => void)[] = [];
        unsubs.push(onSocket('job_updated', (data: { jobId: string }) => {
            if (String(data.jobId) === String(id)) {
                fetchJob(true);
                if (job?.canViewApplicants) fetchApplicants(true);
            }
        }));
        unsubs.push(onSocket('job_deleted', (data: { jobId: string }) => {
            if (String(data.jobId) === String(id)) {
                toast.show('This job has been deleted', 'info');
                navigate('/jobs');
            }
        }));
        return () => unsubs.forEach(fn => fn());
    }, [onSocket, id, fetchJob, fetchApplicants, job?.canViewApplicants, navigate, toast]);

    const handleSave = async () => {
        if (!job) return;
        try {
            await api.post(`/jobs/${job.id}/save`);
            setJob({ ...job, isSaved: !job.isSaved });
            toast.show(job.isSaved ? 'Job unsaved' : 'Job saved', 'success');
        } catch (err) {
            console.error('Failed to save job', err);
        }
    };

    const handleApply = async () => {
        if (!job) return;
        try {
            if (!isAuthenticated) {
                toast.show('Please login to apply', 'error');
                return;
            }
            await api.post(`/jobs/${job.id}/interest`);
            toast.show(job.hasApplied ? 'Application withdrawn' : 'Application submitted', 'success');
            await fetchJob(true);
            if (job.canViewApplicants) fetchApplicants(true);
        } catch (err: any) {
            toast.show(err.response?.data?.message || 'Failed to apply', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Loading job details...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center">Job not found</div>
                <div className="text-center mt-4">
                    <Link to="/jobs" className="text-[var(--accent)] hover:underline">← Back to Jobs</Link>
                </div>
            </div>
        );
    }

    const shareUrl = window.location.origin + `/jobs/${job.id}`;

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Back button */}
            <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4">
                <ChevronLeft size={20} />
                <span>Go back</span>
            </button>

            <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-6">
                {/* Job image */}
                {job.image && (
                    <div className="-mx-6 -mt-6 mb-6 rounded-t-2xl overflow-hidden bg-[var(--bg-tertiary)]">
                        <img
                            src={resolveMediaUrl(job.image)}
                            alt={job.title}
                            className="w-full max-h-[320px] object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Job header */}
                <div className="mb-6">
                    <div className="flex items-start gap-2 mb-3 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-xs text-[var(--text-primary)]">
                            <MapPin size={12} /> {job.location}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-xs text-[var(--text-primary)]">
                            <Briefcase size={12} /> {job.type}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-xs text-[var(--text-primary)]">
                            <Building2 size={12} /> {job.mode}
                        </span>
                        {job.salary && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-xs text-[var(--text-primary)]">
                                <DollarSign size={12} /> {job.salary}
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{job.title}</h1>
                    <p className="text-lg text-[var(--text-primary)] mb-2">{job.company}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Posted {new Date(job.postedAt).toLocaleDateString()} • Apply by Dec 08, 2026 • {job.applicants || 0} views
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border-color)]">
                    <button 
                        onClick={handleApply} 
                        className={`px-8 py-2 font-medium ${
                            job.hasApplied 
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]' 
                                : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                        }`}
                    >
                        {job.hasApplied ? 'Unapply' : 'Apply'}
                    </button>
                    <button onClick={handleSave} className="p-2 hover:bg-[var(--bg-tertiary)]" title="Save job">
                        <Bookmark size={22} className={job.isSaved ? 'text-[var(--accent)] fill-current' : 'text-[var(--text-secondary)]'} />
                    </button>
                    <button onClick={() => setShowShareModal(true)} className="p-2 hover:bg-[var(--bg-tertiary)]" title="Share">
                        <MoreHorizontal size={22} className="text-[var(--text-secondary)]" />
                    </button>
                </div>

                {/* Job details */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Opportunity details</h3>
                        <div>
                            <h4 className="text-sm font-medium text-[var(--accent)] mb-2">Opportunity description</h4>
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">{job.description}</p>
                        </div>
                    </div>

                    {job.requirements && job.requirements.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Requirements</h4>
                            <ul className="space-y-2">
                                {job.requirements.map((req, i) => (
                                    <li key={i} className="text-sm text-[var(--text-primary)] flex items-start gap-2">
                                        <span className="w-1 h-1 bg-[var(--accent)] mt-2 flex-shrink-0" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Applicants list - only visible to job poster and admins */}
                    {job.canViewApplicants && (
                        <div className="pt-6 border-t border-[var(--border-color)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                    Applicants ({job.applicants || 0})
                                </h3>
                                {applicantsLoading && (
                                    <span className="text-xs text-[var(--text-muted)] animate-pulse">Refreshing...</span>
                                )}
                            </div>
                            
                            {applicants.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {applicants.map((applicant) => (
                                        <div key={applicant.id} className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                                            <Link to={`/profile/${applicant.id}`} className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] font-semibold flex-shrink-0 overflow-hidden">
                                                <Avatar src={applicant.avatar} iconSize={18} />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <Link to={`/profile/${applicant.id}`} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] truncate block">
                                                    {applicant.name}
                                                </Link>
                                                <p className="text-xs text-[var(--text-secondary)] truncate">{applicant.batch}</p>
                                                {applicant.appliedAt && (
                                                    <p className="text-xs text-[var(--text-secondary)]">Applied {new Date(applicant.appliedAt).toLocaleDateString()}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : applicantsLoading ? (
                                <div className="text-center text-sm text-[var(--text-secondary)] py-6">Loading applicants...</div>
                            ) : (
                                <div className="text-center text-sm text-[var(--text-secondary)] py-6">No applicants yet</div>
                            )}
                        </div>
                    )}

                    {/* Posted by */}
                    <div className="pt-6 border-t border-[var(--border-color)]">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Posted by</h3>
                        <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-xl overflow-hidden">
                                    <Avatar src={job.postedBy?.avatar} iconSize={24} />
                                </div>
                                <div>
                                    <Link to={`/profile/${job.postedBy?.id}`} className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">
                                        {job.postedBy?.name || 'Admin User'}
                                    </Link>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        Class of {job.postedBy?.batch || '2020'} • {job.applicants || 1} {job.applicants === 1 ? 'applicant' : 'applicants'}
                                    </div>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share modal */}
            <ShareModal open={showShareModal} onClose={() => setShowShareModal(false)} url={shareUrl} resourceType="job" resourceId={String(job.id)} />
            
            {/* Floating share buttons */}
            <JobShareFloating url={shareUrl} />
        </div>
    );
};

export default JobDetail;
