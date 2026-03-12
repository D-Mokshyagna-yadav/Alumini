import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProfessionalChatLayout from './components/layout/ProfessionalChatLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import AccountInfo from './pages/settings/AccountInfo';
import EmailSettings from './pages/settings/EmailSettings';
import ChangePassword from './pages/settings/ChangePassword';
import NotificationPreferences from './pages/settings/NotificationPreferences';
import PhoneSettings from './pages/settings/PhoneSettings';
import Directory from './pages/Directory';
import Events from './pages/Events';
import MyEvents from './pages/MyEvents';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import PostJob from './pages/PostJob';
import Contact from './pages/Contact';
import VerificationPending from './pages/VerificationPending';
import AdminDashboard from './pages/admin/AdminDashboard';
import NewsAdmin from './pages/admin/NewsAdmin';
import TelemetryAdmin from './pages/admin/TelemetryAdmin';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';
import Feed from './pages/Feed';
import Notifications from './pages/Notifications';
import Gallery from './pages/Gallery';
import Saved from './pages/Saved';
import Developers from './pages/Developers';
import ForgotPassword from './pages/ForgotPassword';

// Basic logging hook
function usePageTracking() {
  const location = useLocation();
  useEffect(() => {
    console.log(`[Navigation] Page changed to: ${location.pathname}`);
    console.log(`[Navigation] State:`, location.state);
  }, [location]);
}

// Component to redirect authenticated users to feed
const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin h-12 w-12 rounded-full border-[3px] border-[var(--bg-tertiary)] border-t-[var(--accent)]"></div>
      </div>
    );
  }

  // Redirect authenticated users from landing to feed
  if (isAuthenticated && location.pathname === '/') {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
};

// LinkedIn layout wrapper for authenticated routes
const ProfessionalRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <ProfessionalChatLayout>{children}</ProfessionalChatLayout>
    </ProtectedRoute>
  );
};

// Layout wrapper without auth requirement (public pages using professional layout)
const PublicProfessionalRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProfessionalChatLayout>{children}</ProfessionalChatLayout>
  );
};

function App() {
  usePageTracking();
  return (
    <Routes>
      {/* Public Routes with standard Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={
          <AuthRedirect>
            <Landing />
          </AuthRedirect>
        } />
        <Route path="/verification-pending" element={<VerificationPending />} />
      </Route>

      {/* Auth Pages - No Layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Routes - LinkedIn-style layout */}
      <Route path="/feed" element={<ProfessionalRoute><Feed /></ProfessionalRoute>} />
      <Route path="/profile" element={<ProfessionalRoute><Profile /></ProfessionalRoute>} />
      <Route path="/profile/:id" element={<ProfessionalRoute><Profile /></ProfessionalRoute>} />
      <Route path="/directory" element={<ProfessionalRoute><Directory /></ProfessionalRoute>} />
<Route path="/events" element={<ProfessionalRoute><Events /></ProfessionalRoute>} />
        <Route path="/events/:id" element={<ProfessionalRoute><EventDetail /></ProfessionalRoute>} />
        <Route path="/events/my" element={<ProfessionalRoute><MyEvents /></ProfessionalRoute>} />
        <Route path="/gallery" element={<ProfessionalRoute><Gallery /></ProfessionalRoute>} />
      <Route path="/jobs" element={<ProfessionalRoute><Jobs /></ProfessionalRoute>} />
      <Route path="/jobs/post" element={<ProfessionalRoute><PostJob /></ProfessionalRoute>} />
      <Route path="/jobs/:id" element={<ProfessionalRoute><JobDetail /></ProfessionalRoute>} />
      <Route path="/notifications" element={<ProfessionalRoute><Notifications /></ProfessionalRoute>} />
      <Route path="/settings" element={<ProfessionalRoute><Settings /></ProfessionalRoute>} />
      <Route path="/settings/account-info" element={<ProfessionalRoute><AccountInfo /></ProfessionalRoute>} />
      <Route path="/settings/email" element={<ProfessionalRoute><EmailSettings /></ProfessionalRoute>} />
      <Route path="/settings/phone" element={<ProfessionalRoute><PhoneSettings /></ProfessionalRoute>} />
      <Route path="/settings/change-password" element={<ProfessionalRoute><ChangePassword /></ProfessionalRoute>} />
      <Route path="/settings/notifications" element={<ProfessionalRoute><NotificationPreferences /></ProfessionalRoute>} />
      <Route path="/saved" element={<ProfessionalRoute><Saved /></ProfessionalRoute>} />
      <Route path="/developers" element={<PublicProfessionalRoute><Developers /></PublicProfessionalRoute>} />
      <Route path="/contact" element={<PublicProfessionalRoute><Contact /></PublicProfessionalRoute>} />

      {/* Admin Route */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <ProfessionalChatLayout><AdminDashboard /></ProfessionalChatLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/news" element={
        <ProtectedRoute requireAdmin>
          <ProfessionalChatLayout><NewsAdmin /></ProfessionalChatLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/telemetry" element={
        <ProtectedRoute requireAdmin>
          <ProfessionalChatLayout><TelemetryAdmin /></ProfessionalChatLayout>
        </ProtectedRoute>
      } />
      <Route path="/news" element={<PublicProfessionalRoute><NewsList /></PublicProfessionalRoute>} />
      <Route path="/news/:id" element={<PublicProfessionalRoute><NewsDetail /></PublicProfessionalRoute>} />
    </Routes>
  );
}

export default App;
