import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/Registerpage';
import LoadingScreen from './pages/LoadingScreen';
import DashboardLayout from './features/layout/DashboardLayout';
import DashboardHome from './features/pages/home/DashboardHome';
import CipherGame from './features/ciphergame/CipherGame';
import BadgesPage from './features/badges/BadgesPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"               element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/loading"        element={<LoadingScreen />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardHome />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/ciphergame"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CipherGame />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/fishing"
            element={<Navigate to="/dashboard/ciphergame" replace />}
          />
          <Route
            path="/dashboard/badges"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BadgesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/missions"
            element={<Navigate to="/dashboard/badges" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
