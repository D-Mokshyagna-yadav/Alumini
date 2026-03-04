import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from '../PageTransition';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen font-body text-[var(--text-primary)] bg-[var(--bg-primary)]">
            <Navbar />
            <main className="flex-grow pt-14"> {/* offset for fixed top navbar h-14 */}
                <PageTransition>
                    <Outlet />
                </PageTransition>
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
