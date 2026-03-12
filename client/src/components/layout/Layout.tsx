import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from '../PageTransition';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const isLandingPage = !isAuthenticated && location.pathname === '/';

    return (
        <div className="flex flex-col min-h-screen font-body text-[var(--text-primary)] bg-[var(--bg-primary)]">
            <Navbar />
            <main className={`flex-grow pb-16 md:pb-0 ${isLandingPage ? '' : 'pt-16'}`}>
                <PageTransition>
                    <Outlet />
                </PageTransition>
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
