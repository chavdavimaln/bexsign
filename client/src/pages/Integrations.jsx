import React from 'react';
import { Layers } from 'lucide-react';

export default function Integrations() {
  const integrationsList = [
    { name: 'Zoho CRM', desc: 'Close deals quickly by sending documents directly from Zoho CRM.', status: 'Configured' },
    { name: 'Google Workspace', desc: 'Import users, provide single sign-on access, and sign documents effortlessly.', status: 'Configure' },
    { name: 'Stripe Identity', desc: 'Verify recipient identity using Stripe authentication services.', status: 'Configure' },
    { name: 'Zapier', desc: 'Connect BexSign with 5000+ applications using automated workflows.', status: 'Configure' },
  ];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Integrations & Apps</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {integrationsList.map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-black text-sm">{item.name}</h3>
                <Layers size={18} className="text-primary" />
              </div>
              <p className="text-xs text-gray-500 mb-4">{item.desc}</p>
            </div>
            <button className="self-start text-xs font-bold text-primary hover:underline flex items-center">
              {item.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
