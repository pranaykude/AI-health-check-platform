import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Calls from './pages/Calls';
import CallLogs from './pages/CallLogs';
import LiveActivity from './pages/LiveActivity';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
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
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="calls" element={<Calls />} />
            <Route path="logs" element={<LiveActivity />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
