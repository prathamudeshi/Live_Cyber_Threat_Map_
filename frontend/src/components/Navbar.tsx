import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Database, Play, Pause, Globe } from 'lucide-react';
import { useStream } from '../context/StreamContext';

const Navbar = () => {
  const location = useLocation();
  const { isStreamPaused, toggleStream } = useStream();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white';
  };

  return (
    <header className="bg-[#000129] py-4 border-b border-gray-700 h-14">
      <div className="w-full px-4 relative h-full flex items-center justify-between">
        <div className="flex items-center space-x-8 z-10">
           {/* Logo or Brand could go here if needed, keeping it simple as per request */}
           {/* <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-500" />
              <span className="font-bold text-xl hidden md:block">DeepCytes</span>
           </div> */}
           
           <nav className="flex space-x-6">
            <Link to="/" className={`flex items-center space-x-2 px-1 py-2 transition-colors ${isActive('/')}`}>
              <Shield size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/data" className={`flex items-center space-x-2 px-1 py-2 transition-colors ${isActive('/data')}`}>
              <Database size={18} />
              <span>Data Lists</span>
            </Link>
            <Link to="/analytics" className={`flex items-center space-x-2 px-1 py-2 transition-colors ${isActive('/analytics')}`}>
              <Globe size={18} />
              <span>Country Analytics</span>
            </Link>
           </nav>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none">
          Live Cyber Threat Map
        </h1>

        <button 
          onClick={toggleStream}
          className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors z-10 ${
            isStreamPaused 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isStreamPaused ? <Play size={18} /> : <Pause size={18} />}
          <span>{isStreamPaused ? 'Resume Stream' : 'Pause Stream'}</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
