import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Apply from './pages/Apply';
import HRPortal from './pages/HRPortal';
import StatusPage from './pages/StatusPage';
import Login from './pages/Login';
import CandidateChat from './components/CandidateChat';
import AIAssistant from './components/AIAssistant';
import CandidateScheduling from './pages/CandidateScheduling';
import OnboardingPortal from './pages/OnboardingPortal';
import RPCDiagnostics from './pages/RPCDiagnostics';
import SecurityAudit from './pages/SecurityAudit';
import SystemAlert from './components/SystemAlert';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import EmployeePortal from './pages/EmployeePortal';

// Helper component to handle conditional AI rendering
const ConditionalAIAssistant = () => {
  const location = useLocation();
  const hiddenRoutes = ['/hr', '/login'];
  const isHidden = hiddenRoutes.some(route => location.pathname.startsWith(route));

  if (isHidden) return null;
  return <AIAssistant role="applicant" />;
};

function App() {
  return (
    <div id="vista-app-root">
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/hr"
                element={
                  <ProtectedRoute>
                    <HRPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="/schedule/:token" element={<CandidateScheduling />} />
              <Route path="/diagnostics" element={<RPCDiagnostics />} />
              <Route path="/security-audit" element={<SecurityAudit />} />
              <Route path="/onboarding/:token" element={<OnboardingPortal />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/training" element={<EmployeePortal />} />
            </Routes>
            <SystemAlert />
            <ConditionalAIAssistant />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </div>
  );
}

export default App;
