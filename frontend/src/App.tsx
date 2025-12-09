import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import DataPage from './components/DataPage';
import CountryAnalytics from './components/CountryAnalytics';
import { StreamProvider } from './context/StreamContext';

const MainContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const isDataPage = location.pathname === '/data';
  const isAnalytics = location.pathname === '/analytics';

  return (
    <>
      <div style={{ display: isDashboard ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      <div style={{ display: isDataPage ? 'block' : 'none' }}>
        <DataPage />
      </div>
      <div style={{ display: isAnalytics ? 'block' : 'none' }}>
        <CountryAnalytics />
      </div>
    </>
  );
};

function App() {
  return (
    <StreamProvider>
      <Router>
        <div className="min-h-screen bg-[#111827] text-white">
          <Navbar />
          <MainContent />
        </div>
      </Router>
    </StreamProvider>
  );
}

export default App;
