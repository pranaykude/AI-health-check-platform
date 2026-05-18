import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ScheduledCalls from './pages/ScheduledCalls';
import Calls from './pages/Calls';
import CallLogs from './pages/CallLogs';
import LiveActivity from './pages/LiveActivity';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import SupportTeam from './pages/SupportTeam';
import SupportMemberProfile from './pages/SupportMemberProfile';
import Messages from './pages/Messages';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerifyOtp />} />
          
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'support', 'senior_support', 'technical_support', 'operations']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="scheduled-calls" element={<ScheduledCalls />} />
            <Route path="calls" element={<Calls />} />
            <Route path="messages" element={<Messages />} />
            <Route path="logs" element={<LiveActivity />} />
            <Route path="support-team" element={<SupportTeam />} />
            <Route path="support-team/:id" element={<SupportMemberProfile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
