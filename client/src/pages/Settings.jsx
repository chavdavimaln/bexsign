import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', company: '', jobTitle: '', dateFormat: 'MM/dd/yyyy', timeZone: 'Asia/Kolkata' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings/profile/1');
      const data = await res.json();
      if (res.ok) {
        setProfile({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          company: data.company || '',
          jobTitle: data.job_title || '',
          dateFormat: data.date_format || 'MM/dd/yyyy',
          timeZone: data.time_zone || 'Asia/Kolkata'
        });
      }
    } catch (err) {
      console.error('Failed to load profile from server');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/settings/profile/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Profile updated successfully!');
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl shadow-2xs border border-slate-200 min-h-[calc(100vh-7rem)] text-slate-800">
      {/* Settings Sub-Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
        <h3 className="font-bold text-md mb-3 text-[#E71414]">Settings</h3>
        <ul className="flex flex-wrap md:flex-col gap-1 text-sm">
          {['Profile', 'Integrations', 'Notifications', 'Contacts', 'Trash', 'Developer Settings'].map((tab) => (
            <li key={tab}>
              <button 
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 rounded-lg transition text-xs font-semibold ${activeTab === tab ? 'bg-red-50 text-[#E71414] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Settings Content */}
      <div className="flex-1 p-4 sm:p-8 min-w-0">
        {activeTab === 'Profile' && (
          <div>
            <h2 className="text-xl font-bold mb-6">My Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={profile.firstName} 
                    onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-bexPrimary text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={profile.lastName} 
                    onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-bexPrimary text-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input 
                  type="text" 
                  value={profile.company} 
                  onChange={(e) => setProfile({...profile, company: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-bexPrimary text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Title</label>
                <input 
                  type="text" 
                  value={profile.jobTitle} 
                  onChange={(e) => setProfile({...profile, jobTitle: e.target.value})}
                  className="w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-bexPrimary text-black"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-bexPrimary text-white px-6 py-2 rounded text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'Integrations' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Integrations</h2>
            <p className="text-sm text-gray-500 mb-6">Connect BexSign with external CRMs, cloud storage, and identity providers like Zoho CRM, Google Workspace, Stripe, and Zapier.</p>
            <div className="grid grid-cols-3 gap-4">
              {['Zoho CRM', 'Google Workspace', 'Microsoft 365', 'Stripe Identity', 'Dropbox', 'Zapier'].map((app) => (
                <div key={app} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                  <span className="font-semibold text-sm">{app}</span>
                  <button className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-semibold hover:border-bexPrimary hover:text-bexPrimary">Configure</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Developer Settings' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Developer Settings</h2>
            <p className="text-sm text-gray-500 mb-4">Generate OAuth access tokens and API keys for external applications to interact with BexSign.</p>
            <div className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">OAuth Access Token</p>
                <p className="text-xs text-gray-400">Used for API authentication and quick start integrations.</p>
              </div>
              <button onClick={() => alert('Token Generated: bx_live_907444916')} className="bg-bexPrimary text-white px-4 py-2 rounded text-xs font-semibold hover:bg-red-700">Generate Token</button>
            </div>
          </div>
        )}

        {['Notifications', 'Contacts', 'Trash'].includes(activeTab) && (
          <div>
            <h2 className="text-xl font-bold mb-4">{activeTab} Module</h2>
            <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-500 text-sm">{activeTab} management panel configured for BexSign.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
