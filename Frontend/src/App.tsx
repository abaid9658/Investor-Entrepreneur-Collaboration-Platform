import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Dashboard Pages
import { EntrepreneurDashboard } from './pages/dashboard/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/dashboard/InvestorDashboard';

// Profile Pages
import { EntrepreneurProfile } from './pages/profile/EntrepreneurProfile';
import { InvestorProfile } from './pages/profile/InvestorProfile';

// Feature Pages
import { InvestorsPage } from './pages/investors/InvestorsPage';
import { EntrepreneursPage } from './pages/entrepreneurs/EntrepreneursPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { HelpPage } from './pages/help/HelpPage';
import { DealsPage } from './pages/deals/DealsPage';
import { ChatPage } from './pages/chat/ChatPage';

import { DocumentVaultPage } from './pages/documents/DocumentVaultPage';
import { MeetingCalendarPage } from './pages/meetings/MeetingCalendarPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { VideoCallRoomPage } from './pages/video/VideoCallRoomPage';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';

// Lazy-loaded for code-splitting heavy pages
const DocumentsPage = lazy(() =>
  import('./pages/documents/DocumentsPage').then(m => ({ default: m.DocumentsPage }))
);

// ─── Protected Route Wrapper ─────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading Nexus...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ─── Page Loading Fallback ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Auth Routes ─────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Video Call Room (full-screen, outside dashboard layout) ── */}
      <Route
        path="/room/:roomId"
        element={
          <ProtectedRoute>
            <VideoCallRoomPage />
          </ProtectedRoute>
        }
      />

      {/* ── Protected Dashboard Routes ─────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
        <Route path="investor" element={<InvestorDashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route index element={<Navigate to="entrepreneur" replace />} />
      </Route>

      {/* ── Profile Routes ─────────────────────────────────────── */}
      <Route path="/profile" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="entrepreneur/:id" element={<EntrepreneurProfile />} />
        <Route path="investor/:id" element={<InvestorProfile />} />
      </Route>

      {/* ── Investors & Entrepreneurs Discovery ────────────────── */}
      <Route path="/investors" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<InvestorsPage />} />
      </Route>
      <Route path="/entrepreneurs" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<EntrepreneursPage />} />
      </Route>

      {/* ── Meetings Calendar ──────────────────────────────────── */}
      <Route path="/meetings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<MeetingCalendarPage />} />
      </Route>

      {/* ── Document Vault ─────────────────────────────────────── */}
      <Route path="/documents" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DocumentVaultPage />} />
        <Route
          path="library"
          element={
            <Suspense fallback={<PageLoader />}>
              <DocumentsPage />
            </Suspense>
          }
        />
      </Route>

      {/* ── Payments & Ledger ──────────────────────────────────── */}
      <Route path="/payments" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<PaymentsPage />} />
      </Route>

      {/* ── Chat & Messages ────────────────────────────────────── */}
      <Route path="/chat" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ChatPage />} />
        <Route path=":userId" element={<ChatPage />} />
      </Route>
      <Route path="/messages" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<MessagesPage />} />
      </Route>

      {/* ── Notifications ──────────────────────────────────────── */}
      <Route path="/notifications" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<NotificationsPage />} />
      </Route>

      {/* ── Deals ──────────────────────────────────────────────── */}
      <Route path="/deals" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DealsPage />} />
      </Route>

      {/* ── Settings & Help ────────────────────────────────────── */}
      <Route path="/settings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SettingsPage />} />
      </Route>
      <Route path="/help" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<HelpPage />} />
      </Route>

      {/* ── Redirects ──────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  React.useEffect(() => {
    const saved = localStorage.getItem('nexus_theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e1b4b',
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </SocketProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;