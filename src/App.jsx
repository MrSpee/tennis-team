import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
// Analytics minimal - nur wenn Vercel korrekt konfiguriert ist
import { Analytics } from '@vercel/analytics/react';
import AppLogin from './components/AppLogin';
import Dashboard from './components/Dashboard';
import Matches from './components/Matches';
import Rankings from './components/Rankings';
import LeagueTable from './components/LeagueTable';
import AdminPanel from './components/AdminPanel';
import SupabaseProfile from './components/SupabaseProfile';
import PlayerProfileSimple from './components/PlayerProfileSimple';
import PasswordResetPage from './components/PasswordResetPage';
import LiveResults from './components/LiveResults';
import LiveResultsWithDB from './components/LiveResultsWithDB';
import MatchdayResults from './components/MatchdayResults';
import Results from './components/Results';
import Training from './components/Training';
import OnboardingFlow from './components/OnboardingFlow';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import Navigation from './components/Navigation';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();
  
  // Während Loading: Zeige nichts (verhindert Flackern)
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🎾</div>
        <div>Lade Session...</div>
      </div>
    );
  }
  
  // Nicht eingeloggt → Login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Eingeloggt aber kein Team → Onboarding (nur wenn nicht bereits auf /login)
  if (needsOnboarding && window.location.pathname !== '/onboarding' && window.location.pathname !== '/login') {
    return <Navigate to="/onboarding" />;
  }
  
  return children;
}

// Captain Route Component
function CaptainRoute({ children }) {
  const { isAuthenticated, isCaptain, loading } = useAuth();
  
  // Während Loading: Zeige nichts (verhindert Flackern)
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🎾</div>
        <div>Lade Session...</div>
      </div>
    );
  }
  
  return isAuthenticated && isCaptain ? children : <Navigate to="/" />;
}

// Super Admin Route Component
function SuperAdminRoute({ children }) {
  const { isAuthenticated, loading, player } = useAuth();
  
  if (loading) return null;
  
  // Prüfe ob User Super-Admin ist
  const isSuperAdmin = player?.is_super_admin === true;
  
  return isAuthenticated && isSuperAdmin ? children : <Navigate to="/" />;
}

function AppContent() {
  const { isAuthenticated, loading, needsOnboarding } = useAuth();
  const showNavigation = isAuthenticated && !needsOnboarding;
  const showHeader = isAuthenticated && !needsOnboarding;

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <ScrollToTop />
        {showHeader && <Header />}
        {showNavigation && <Navigation />}
        <Routes>
          <Route path="/login" element={
            loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '2rem' }}>🎾</div>
                <div>Lade Session...</div>
              </div>
            ) : (
              <AppLogin />
            )
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/matches" element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          } />
          
          <Route path="/rankings" element={
            <ProtectedRoute>
              <Rankings />
            </ProtectedRoute>
          } />
          
          <Route path="/league" element={
            <ProtectedRoute>
              <LeagueTable />
            </ProtectedRoute>
          } />
          
          <Route path="/results" element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          } />
          
          <Route path="/training" element={
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          } />
          
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          } />
          
          {/* Super Admin Route - Nur für Super-Admins sichtbar */}
          <Route path="/super-admin" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <SupabaseProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/player/:playerName" element={
            <ProtectedRoute>
              <PlayerProfileSimple />
            </ProtectedRoute>
          } />
          
          <Route path="/password-reset" element={<PasswordResetPage />} />
          
          <Route path="/ergebnisse/:matchId" element={
            <ProtectedRoute>
              <MatchdayResults />
            </ProtectedRoute>
          } />
          
          <Route path="/ergebnisse/:matchId/edit" element={
            <ProtectedRoute>
              <LiveResultsWithDB />
            </ProtectedRoute>
          } />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/live-results/:matchId" element={
            <ProtectedRoute>
              <MatchdayResults />
            </ProtectedRoute>
          } />
          
          <Route path="/live-results/:matchId/edit" element={
            <ProtectedRoute>
              <LiveResultsWithDB />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <CaptainRoute>
              <AdminPanel />
            </CaptainRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
        {/* Analytics minimal - nur Web Analytics, kein Speed Insights */}
        <Analytics />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

