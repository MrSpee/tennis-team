import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import SupabaseLogin from './components/SupabaseLogin';
import Dashboard from './components/Dashboard';
import Matches from './components/Matches';
import Rankings from './components/Rankings';
import LeagueTable from './components/LeagueTable';
import AdminPanel from './components/AdminPanel';
import SupabaseProfile from './components/SupabaseProfile';
import Navigation from './components/Navigation';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
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
  
  return isAuthenticated ? children : <Navigate to="/login" />;
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

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Router>
      <div className="app">
        <ScrollToTop />
        {isAuthenticated && <Header />}
        {isAuthenticated && <Navigation />}
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
              <SupabaseLogin />
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
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <SupabaseProfile />
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
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

