import { useAuth } from '../../context/AuthContext';
import PageTransition from '../PageTransition';
import Navbar from './Navbar';
import Footer from './Footer';

interface ProfessionalChatLayoutProps {
    children: React.ReactNode;
}

const ProfessionalChatLayout = ({ children }: ProfessionalChatLayoutProps) => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex flex-col">
            <Navbar />
            <main className={`pt-16 ${isAuthenticated ? 'pb-16 md:pb-0' : ''} flex-1`}>
                <PageTransition>
                    {children}
                </PageTransition>
            </main>
            <Footer />
        </div>
    );
};

export default ProfessionalChatLayout;
