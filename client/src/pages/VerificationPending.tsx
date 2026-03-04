import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Mail } from 'lucide-react';

const VerificationPending = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-secondary)] shadow-sm p-6 sm:p-10 max-w-md w-full text-center"
            >
                <div className="w-16 h-16 mx-auto mb-6 bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Clock size={32} className="text-[var(--text-muted)]" />
                </div>

                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                    Verification Pending
                </h1>

                <p className="text-[var(--text-secondary)] mb-2">
                    Thank you for registering! Your account is currently under review by our admin team. This typically takes
                </p>
                <p className="text-[var(--text-primary)] font-semibold mb-6">
                    24-48 hours.
                </p>

                <div className="bg-[var(--bg-primary)] p-5 mb-6 text-left">
                    <h3 className="font-semibold text-[var(--text-primary)] text-center mb-4">
                        What happens next?
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <CheckCircle size={20} className="text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--text-secondary)] text-sm">
                                Admin will verify your university credentials
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Mail size={20} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--text-secondary)] text-sm">
                                You'll receive an email once approved
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle size={20} className="text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
                            <span className="text-[var(--text-secondary)] text-sm">
                                Then you can access all alumni features
                            </span>
                        </li>
                    </ul>
                </div>

                <Link
                    to="/"
                    className="block w-full py-3 border border-[var(--border-color)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-primary)] transition-colors"
                >
                    Return to Homepage
                </Link>
            </motion.div>
        </div>
    );
};

export default VerificationPending;
