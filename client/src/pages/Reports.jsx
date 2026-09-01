import React, { useState } from 'react';
import { Calendar, Filter, Download, BarChart2, PieChart, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState('21-Aug-2026 - 27-Aug-2026');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const reportsData = [
    { name: 'Document Sign 4', owner: 'manu.yadav@oladigital.health', type: 'Others', sentOn: 'Aug 27, 2026 02:36', status: 'IN PROGRESS', statusColor: 'bg-amber-100 text-amber-800' },
    { name: 'First sign.pdf', owner: 'manu.yadav@oladigital.health', type: 'Others', sentOn: 'Aug 27, 2026 01:59', status: 'COMPLETED', statusColor: 'bg-[#00a884]/20 text-[#00a884]' },
    { name: 'Document Sign', owner: 'manu.yadav@oladigital.health', type: 'Others', sentOn: 'Aug 27, 2026 00:52', status: 'COMPLETED', statusColor: 'bg-[#00a884]/20 text-[#00a884]' },
    { name: 'Document Sign', owner: 'manu.yadav@oladigital.health', type: 'Others', sentOn: 'Aug 25, 2026 00:04', status: 'IN PROGRESS', statusColor: 'bg-amber-100 text-amber-800' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar (Page 20 "sign_fileds" PDF) */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
        <h1 className="text-xl font-extrabold text-slate-900">All Reports</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Filter size={14} /> Filter
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              Export as <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-20 text-xs font-semibold text-slate-700 py-1">
                <button onClick={() => { alert('Exported report as PDF'); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">PDF</button>
                <button onClick={() => { alert('Exported report as CSV'); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">CSV</button>
                <button onClick={() => { alert('Exported report as Excel'); setShowExportMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">Excel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Picker Row */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span>Date:</span>
        <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 font-mono flex items-center gap-2">
          <Calendar size={14} className="text-[#00a884]" /> {dateRange}
        </div>
      </div>

      {/* Charts Grid (Page 20 PDF Screenshots) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">Weekly Document Activity</span>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[#00a884] rounded-xs" /> Completed</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-amber-500 rounded-xs" /> In progress</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-rose-500 rounded-xs" /> Declined</span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-44 flex items-end justify-between gap-4 pt-6 px-4 border-b border-slate-200">
            {['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map((day, idx) => {
              const heights = [0, 60, 0, 0, 40, 0, 90];
              const isWed = day === 'Wed';
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end items-center h-32">
                    {heights[idx] > 0 && (
                      <div className="w-8 rounded-t space-y-0.5">
                        {isWed && <div className="h-4 w-full bg-amber-500 rounded-t" />}
                        <div className="w-full bg-[#00a884] rounded-t" style={{ height: `${heights[idx]}px` }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Percentage Donut / Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <span className="font-bold text-slate-800 text-xs">Status Distribution</span>
          <div className="relative h-40 flex items-center justify-center">
            {/* Pie Chart Representation */}
            <div className="h-32 w-32 rounded-full border-8 border-[#00a884] bg-emerald-50 flex items-center justify-center font-black text-slate-800 text-lg shadow-inner">
              75%
            </div>
          </div>
          <div className="space-y-1 text-[11px] font-bold text-slate-600">
            <div className="flex justify-between"><span>● Completed</span><span>75%</span></div>
            <div className="flex justify-between text-amber-600"><span>● In progress</span><span>25%</span></div>
          </div>
        </div>
      </div>

      {/* Reports Data Table (Page 20 PDF) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs w-full overflow-hidden">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200">
              <th className="p-3.5 w-[38%] sm:w-[32%] md:w-[28%] leading-tight">DOCUMENT NAME</th>
              <th className="p-3.5 w-[24%] sm:w-[22%] md:w-[20%] leading-tight">OWNER</th>
              <th className="p-3.5 hidden md:table-cell md:w-[18%] leading-tight whitespace-normal">DOCUMENT TYPE</th>
              <th className="p-3.5 hidden sm:table-cell sm:w-[20%] md:w-[16%] whitespace-nowrap leading-tight">SENT ON</th>
              <th className="p-3.5 w-[38%] sm:w-[26%] md:w-[18%] whitespace-nowrap leading-tight">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {reportsData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="p-3.5 font-bold text-slate-900 break-all sm:break-words leading-snug align-middle">
                  {row.name}
                </td>
                <td className="p-3.5 text-slate-600 align-middle leading-snug break-words">{row.owner}</td>
                <td className="p-3.5 text-slate-500 hidden md:table-cell align-middle leading-snug">{row.type}</td>
                <td className="p-3.5 text-slate-500 font-mono text-[11px] hidden sm:table-cell whitespace-nowrap align-middle">{row.sentOn}</td>
                <td className="p-3.5 whitespace-nowrap align-middle">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wider inline-block ${row.statusColor}`}>
                    ● {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
