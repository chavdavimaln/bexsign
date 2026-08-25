import React, { useState, useEffect } from 'react';
import { Send, FileSignature } from 'lucide-react';
import API from '../api/axios';

export default function Dashboard({ setActiveTab }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const response = await API.get('/documents/activity-logs');
      if (response.data?.logs) {
        setLogs(response.data.logs);
      }
    } catch (err) {
      console.warn('Activity logs fetch warning:', err.message);
    }
  };

  return (
    <div className="p-6 flex gap-6 h-full bg-gray-50 overflow-y-auto">
      {/* Main Action Area */}
      <div className="flex-1 space-y-6">
        <h2 className="text-2xl font-bold text-black">Sign & Manage Envelopes</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div 
            onClick={() => setActiveTab && setActiveTab('send-signatures')}
            className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition"
          >
            <div className="p-4 bg-red-50 text-primary rounded-full mb-4">
              <Send size={32} />
            </div>
            <h3 className="font-bold text-black text-lg">Send for signatures</h3>
            <p className="text-xs text-gray-500 mt-1">Upload documents and request signatures from recipients</p>
          </div>

          <div 
            onClick={() => setActiveTab && setActiveTab('sign-yourself')}
            className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition"
          >
            <div className="p-4 bg-red-50 text-primary rounded-full mb-4">
              <FileSignature size={32} />
            </div>
            <h3 className="font-bold text-black text-lg">Sign yourself</h3>
            <p className="text-xs text-gray-500 mt-1">Self-sign a document without other recipients</p>
          </div>
        </div>
      </div>

      {/* Activity Feed Sidebar Widget */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 rounded-lg shadow-sm shrink-0">
        <h3 className="font-bold text-black mb-4 border-b pb-2">Activity feed</h3>
        <div className="space-y-4 text-xs text-gray-600">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="border-b pb-2">
                <p className="font-semibold text-black">{log.document_name || 'System Activity'}</p>
                <p>{log.activity_description}</p>
                <span className="text-[10px] text-gray-400">{new Date(log.time_of_activity).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <>
              <div className="border-b pb-2">
                <p className="font-semibold text-black">Document Viewed</p>
                <p>file.pdf viewed by recipient</p>
                <span className="text-[10px] text-gray-400">Aug 25, 2026 - 10:15 PM</span>
              </div>
              <div className="border-b pb-2">
                <p className="font-semibold text-black">Document Signed</p>
                <p>Agreement.pdf signed successfully</p>
                <span className="text-[10px] text-gray-400">Aug 25, 2026 - 09:30 PM</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
