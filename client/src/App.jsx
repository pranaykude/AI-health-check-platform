import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Calls from './pages/Calls';
import CallLogs from './pages/CallLogs';
import LiveActivity from './pages/LiveActivity';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="calls" element={<Calls />} />
          <Route path="logs" element={<LiveActivity />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
