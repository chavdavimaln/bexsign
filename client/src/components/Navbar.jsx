import React, { useState } from 'react';
import { LayoutDashboard, FileText, FileSpreadsheet, BarChart2, Settings, Layers, Plus, Search, Bell, LogOut } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { name: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard' },
    { name: 'Documents', icon: FileText, tab: 'documents' },
    { name: 'Templates', icon: FileSpreadsheet, tab: 'templates' },
    { name: 'Reports', icon: BarChart2, tab: 'reports' },
    { name: 'Integrations', icon: Layers, tab: 'integrations' },
    { name: 'Settings', icon: Settings, tab: 'settings' },
  ];

  const userInitial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : 'M');

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 bg-black flex flex-col items-center py-4 justify-between shadow-lg z-20">
        <div className="flex flex-col items-center space-y-6">
          <div className="bg-primary text-white p-2 rounded-lg font-bold text-xl cursor-pointer" onClick={() => setActiveTab('dashboard')}>B</div>
          <nav className="flex flex-col space-y-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.tab)}
                  className={`p-3 rounded-lg transition ${
                    isActive ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title={item.name}
                >
                  <Icon size={22} />
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col space-y-4 items-center">
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-3 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          )}
          <button 
            onClick={() => setActiveTab('create-document')} 
            className="bg-primary text-white p-3 rounded-lg shadow hover:bg-red-700 transition"
            title="Create New"
          >
            <Plus size={24} />
          </button>
        </div>
      </aside>

      {/* Main Content Header & View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 shrink-0">
          <h1 className="text-xl font-bold text-black">Bex<span className="text-primary">Sign</span></h1>
          
          {/* Quick Search Bar */}
          <div className="relative w-1/3">
            <div 
              onClick={() => setSearchOpen(true)}
              className="flex items-center bg-gray-100 rounded-md px-3 py-2 cursor-pointer border border-gray-200"
            >
              <Search size={18} className="text-gray-500 mr-2" />
              <span className="text-sm text-gray-500">Look for pages, settings and actions...</span>
            </div>

            {/* Quick Navigation Modal */}
            {searchOpen && (
              <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-b pb-2 focus:outline-none text-black"
                  autoFocus
                />
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  <div onClick={() => { setActiveTab('dashboard'); setSearchOpen(false); }} className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-black font-medium">
                    Dashboard <span className="block text-xs text-gray-500">Snapshot of key features and quick actions</span>
                  </div>
                  <div onClick={() => { setActiveTab('documents'); setSearchOpen(false); }} className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-black font-medium">
                    All Documents <span className="block text-xs text-gray-500">View all documents and their status</span>
                  </div>
                  <div onClick={() => { setActiveTab('templates'); setSearchOpen(false); }} className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-black font-medium">
                    Templates <span className="block text-xs text-gray-500">Manage reusable agreement templates</span>
                  </div>
                  <div onClick={() => { setActiveTab('integrations'); setSearchOpen(false); }} className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-black font-medium">
                    Integrations <span className="block text-xs text-gray-500">Workspace connectors & apps</span>
                  </div>
                  <div onClick={() => { setActiveTab('settings'); setSearchOpen(false); }} className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-black font-medium">
                    Settings <span className="block text-xs text-gray-500">Account profile, notifications & API tokens</span>
                  </div>
                </div>
                <button onClick={() => setSearchOpen(false)} className="mt-3 text-xs text-primary font-bold">Close</button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Bell size={20} className="text-gray-600 cursor-pointer hover:text-black" />
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm cursor-pointer" title={user?.email || 'Profile'}>
              {userInitial}
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
