import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Layers, CheckCircle2, ArrowRight, Table, FileText } from 'lucide-react';

export default function BulkSend() {
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);
  const [mappedColumns, setMappedColumns] = useState({
    recipient_email: 'Email',
    signer_name: 'Name',
    company: 'Company'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const sampleData = [
    { name: 'Alice Smith', email: 'alice@example.com', company: 'Acme Corp' },
    { name: 'Bob Jones', email: 'bob@example.com', company: 'Tech Inc' },
    { name: 'Charlie Brown', email: 'charlie@example.com', company: 'Global LLC' },
    { name: 'Diana Prince', email: 'diana@example.com', company: 'Themyscira Ltd' },
    { name: 'Ethan Hunt', email: 'ethan@example.com', company: 'IMF Operations' }
  ];

  const handleStartBulkSend = () => {
    setIsProcessing(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setCompletedCount(count);
      if (count >= sampleData.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          alert('Bulk Send completed! 5 signature envelopes dispatched.');
          navigate('/documents/sent/in-progress');
        }, 1000);
      }
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Bulk Send (Mail Merge Engine)</h1>
        <p className="text-xs text-slate-500 mt-1">Upload a CSV file to map columns and batch dispatch personalized signature envelopes.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Upload size={18} className="text-[#E71414]" /> 1. Select Template & CSV File
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 mb-1">Selected Template</label>
              <select className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-semibold">
                <option>Standard Sales Agreement Template</option>
                <option>Employee NDA Template</option>
                <option>Vendor Agreement Template</option>
              </select>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 mb-1">Upload Recipient CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0] || { name: 'recipients_batch_2026.csv' })}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-[#E71414]"
              />
            </div>
          </div>
        </div>

        {/* CSV Mapping & Preview */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Table size={18} className="text-[#E71414]" /> 2. CSV Columns Mapping & Recipient Preview ({sampleData.length} Envelopes)
          </h2>

          <div className="border border-slate-200 bg-white rounded-xl shadow-2xs w-full overflow-hidden">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
                <th className="p-3 w-[14%] sm:w-[10%] md:w-[8%] whitespace-nowrap">Row</th>
                <th className="p-3 w-[32%] sm:w-[28%] md:w-[26%] leading-tight">Signer Name</th>
                <th className="p-3 w-[36%] sm:w-[32%] md:w-[28%] leading-tight">Signer Email</th>
                <th className="p-3 hidden md:table-cell md:w-[24%] leading-tight">Company</th>
                <th className="p-3 text-right w-[18%] sm:w-[16%] md:w-[14%] whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sampleData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-400 font-mono whitespace-nowrap align-middle">#{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900 break-words leading-snug align-middle">{row.name}</td>
                  <td className="p-3 text-slate-600 break-all leading-snug align-middle">
                    {row.email}
                  </td>
                  <td className="p-3 text-slate-600 hidden md:table-cell break-words leading-snug align-middle">{row.company}</td>
                  <td className="p-3 text-right whitespace-nowrap align-middle">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-extrabold inline-block">Ready</span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

        {/* Batch Dispatch Progress */}
        {isProcessing && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-bold text-[#E71414]">
              <span>Dispatching Batch Envelopes...</span>
              <span>{completedCount} of {sampleData.length} Sent</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#E71414] h-2.5 transition-all duration-300"
                style={{ width: `${(completedCount / sampleData.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={handleStartBulkSend}
            disabled={isProcessing}
            className="btn-primary px-6 py-2.5 rounded-lg text-xs font-extrabold flex items-center gap-2 shadow-md"
          >
            <Layers size={16} /> {isProcessing ? 'Processing Batch...' : 'Start Bulk Mail Merge Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
}
