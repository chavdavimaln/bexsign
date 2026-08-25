import React, { useState } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 text-bexText overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col justify-between shrink-0 z-20`}>
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <span className={`font-bold text-xl text-bexPrimary ${!sidebarOpen && 'hidden'}`}>BexSign</span>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-100 text-gray-700">
              ☰
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 space-y-1 px-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>🏠</span>
              {sidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link to="/documents" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>📁</span>
              {sidebarOpen && <span>Documents</span>}
            </Link>
            <Link to="/templates" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>📄</span>
              {sidebarOpen && <span>Templates</span>}
            </Link>
            <Link to="/reports" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>📊</span>
              {sidebarOpen && <span>Reports</span>}
            </Link>
            <Link to="/integrations" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>🧩</span>
              {sidebarOpen && <span>Integrations</span>}
            </Link>
            <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-bexPrimary transition font-medium text-sm">
              <span>⚙️</span>
              {sidebarOpen && <span>Settings</span>}
            </Link>
          </nav>
        </div>

        {/* Quick Action Button at Bottom of Sidebar */}
        <div className="p-4 border-t border-gray-100">
          <Link to="/documents/create" className="w-full bg-bexPrimary text-white py-2 px-3 rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition text-sm">
            <span>+</span>
            {sidebarOpen && <span>Create</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm shrink-0">
          {/* Quick Search Bar */}
          <div className="relative w-96">
            <input 
              type="text" 
              placeholder="Look for pages, settings and actions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bexPrimary text-black"
            />
            <span className="absolute left-3 top-2 text-gray-400 text-sm">🔍</span>
          </div>

          {/* Right Header Icons & Profile */}
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-bexText relative">
              🔔
              <span className="absolute -top-1 -right-1 bg-bexPrimary text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">2</span>
            </button>
            <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
              <div className="h-8 w-8 rounded-full bg-bexPrimary text-white flex items-center justify-center font-bold text-sm">
                BS
              </div>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:underline font-medium">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
