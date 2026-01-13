import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Apply from './pages/Apply';
import HRPortal from './pages/HRPortal';
import StatusPage from './pages/StatusPage';
import EmployeePortal from './pages/EmployeePortal';
import CandidateChat from './components/CandidateChat';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/hr" element={<HRPortal />} />
        <Route path="/training" element={<EmployeePortal />} />
      </Routes>
      <CandidateChat />
    </Router>
  );
}

export default App;
