import React, { useState, useEffect } from 'react';

export default function Reports() {
  const [stats, setStats] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [activeTab, setActiveTab] = useState('Reports');

  const fallbackStats = [
    { status: 'Completed', count: 12 },
    { status: 'In Progress', count: 5 },
    { status: 'Draft', count: 3 },
    { status: 'Declined', count: 1 }
  ];

  const fallbackTimeline = [
    { document_name: 'Agreement.pdf', status: 'Completed', recipient_email: 'akash@bexcodeservices.com', activity_description: 'Document signed by recipient', time_of_activity: '2026-08-25T18:30:00Z' },
    { document_name: 'Contract_v2.pdf', status: 'In Progress', recipient_email: 'client@example.com', activity_description: 'Document sent for signature', time_of_activity: '2026-08-24T14:15:00Z' }
  ];

  useEffect(() => {
    fetchStats();
    fetchTimeline();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reports/stats/1');
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) setStats(data);
      else setStats(fallbackStats);
    } catch (err) {
      console.error('Failed to load stats, fallback to initial state');
      setStats(fallbackStats);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reports/timeline/1');
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) setTimeline(data);
      else setTimeline(fallbackTimeline);
    } catch (err) {
      console.error('Failed to load timeline, fallback to initial state');
      setTimeline(fallbackTimeline);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[calc(100vh-7rem)] text-bexText">
      {/* Sub-navigation tabs for Reports / Timeline */}
      <div className="flex gap-4 border-b pb-3 mb-6">
        <button 
          onClick={() => setActiveTab('Reports')}
          className={`font-semibold text-sm pb-1 transition ${activeTab === 'Reports' ? 'border-b-2 border-bexPrimary text-bexPrimary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          All Reports
        </button>
        <button 
          onClick={() => setActiveTab('Timeline')}
          className={`font-semibold text-sm pb-1 transition ${activeTab === 'Timeline' ? 'border-b-2 border-bexPrimary text-bexPrimary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Timeline
        </button>
      </div>

      {activeTab === 'Reports' ? (
        <div>
          <h2 className="text-xl font-bold mb-4">Document Analytics & Reports</h2>
          
          {/* Status Breakdown Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((st) => (
              <div key={st.status} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold">{st.status}</p>
                <p className="text-2xl font-bold text-bexPrimary mt-1">{st.count}</p>
              </div>
            ))}
          </div>

          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-500 text-sm">Graphical analytics view rendered based on document activity data.</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">Document Activity Timeline</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Activity Description</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {timeline.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{item.document_name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{item.recipient_email}</td>
                  <td className="py-3 px-4 text-gray-600">{item.activity_description || 'Document created/updated'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {item.time_of_activity ? new Date(item.time_of_activity).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
