import React from 'react';
import { Link } from 'react-router-dom';
import { Send, PenTool, FileBox, PlusCircle, ArrowRight, FileCheck, Clock, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, Vimal</h1>
          <p className="text-slate-500 text-sm mt-1">Here is your Bexsign electronic signature dashboard overview.</p>
        </div>
        <Link
          to="/documents/create"
          className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-sm shadow-sm"
        >
          <PlusCircle size={18} />
          Create Document
        </Link>
      </div>

      {/* BexSign Primary Hero Action Cards (Page 1) */}
      <div className="flex flex-wrap justify-center items-center gap-6 py-4">
        <Link
          to="/send-for-signatures"
          className="w-64 h-36 bg-white border-2 border-slate-200 hover:border-[#007355] rounded-xl flex flex-col items-center justify-center p-4 text-center shadow-xs hover:shadow-md transition group cursor-pointer"
        >
          <div className="p-3 text-[#007355] group-hover:scale-110 transition-transform">
            <Send size={32} />
          </div>
          <span className="font-bold text-slate-800 text-base mt-1">Send for signatures</span>
        </Link>

        <Link
          to="/sign-yourself"
          className="w-64 h-36 bg-white border-2 border-slate-200 hover:border-[#007355] rounded-xl flex flex-col items-center justify-center p-4 text-center shadow-xs hover:shadow-md transition group cursor-pointer"
        >
          <div className="p-3 text-[#007355] group-hover:scale-110 transition-transform">
            <PenTool size={32} />
          </div>
          <span className="font-bold text-slate-800 text-base mt-1">Sign yourself</span>
        </Link>
      </div>

      {/* Metric Counters (Section 6 PDF Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Docs</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">128</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-700">
            <FileCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">In Progress</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">15</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">96</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <FileCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#E71414]">Pending</p>
            <p className="text-3xl font-extrabold text-[#E71414] mt-1">17</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-[#E71414]">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Core 4 Quick Actions (Section 6 PDF Requirement) */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/send-for-signatures"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-[#E71414] hover:shadow-md transition group"
          >
            <div className="p-3 bg-red-50 text-[#E71414] rounded-lg w-fit group-hover:bg-[#E71414] group-hover:text-white transition">
              <Send size={22} />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-base">Send for Signature</h3>
            <p className="text-xs text-slate-500 mt-1">Upload PDF, place fields & request signatures from external parties.</p>
          </Link>

          <Link
            to="/sign-yourself"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-[#E71414] hover:shadow-md transition group"
          >
            <div className="p-3 bg-red-50 text-[#E71414] rounded-lg w-fit group-hover:bg-[#E71414] group-hover:text-white transition">
              <PenTool size={22} />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-base">Sign Yourself</h3>
            <p className="text-xs text-slate-500 mt-1">Self-sign a document directly and download instant signed copy.</p>
          </Link>

          <Link
            to="/templates"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-[#E71414] hover:shadow-md transition group"
          >
            <div className="p-3 bg-red-50 text-[#E71414] rounded-lg w-fit group-hover:bg-[#E71414] group-hover:text-white transition">
              <FileBox size={22} />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-base">Use Template</h3>
            <p className="text-xs text-slate-500 mt-1">Pick a pre-configured template with assigned roles & fields.</p>
          </Link>

          <Link
            to="/documents/create"
            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-[#E71414] hover:shadow-md transition group"
          >
            <div className="p-3 bg-red-50 text-[#E71414] rounded-lg w-fit group-hover:bg-[#E71414] group-hover:text-white transition">
              <PlusCircle size={22} />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-base">Create Document</h3>
            <p className="text-xs text-slate-500 mt-1">Upload from Desktop, Google Drive, OneDrive, or Dropbox.</p>
          </Link>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Recent Documents</h2>
          <Link to="/documents/sent/all" className="text-xs font-semibold text-[#E71414] hover:underline flex items-center gap-1">
            View All Sent <ArrowRight size={14} />
          </Link>
        </div>

        <div className="w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase">
                <th className="p-3.5 sm:p-4 w-[34%] sm:w-[32%] leading-tight">Document</th>
                <th className="p-3.5 sm:p-4 w-[32%] sm:w-[28%] leading-tight">Recipient</th>
                <th className="p-3.5 sm:p-4 w-[18%] sm:w-[15%] whitespace-nowrap leading-tight">Status</th>
                <th className="p-3.5 sm:p-4 hidden sm:table-cell sm:w-[13%] whitespace-nowrap leading-tight">Date</th>
                <th className="p-3.5 sm:p-4 text-right w-[16%] sm:w-[12%] whitespace-nowrap leading-tight">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr className="hover:bg-slate-50/80 transition">
                <td className="p-3.5 sm:p-4 font-semibold text-slate-900 align-middle">
                  <div className="flex items-start gap-2">
                    <FileCheck size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-all sm:break-words leading-snug" title="Contract.pdf">Contract.pdf</span>
                  </div>
                </td>
                <td className="p-3.5 sm:p-4 text-slate-600 align-middle break-all leading-snug">
                  John Doe (john@example.com)
                </td>
                <td className="p-3.5 sm:p-4 whitespace-nowrap align-middle">
                  <span className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full text-xs inline-block">
                    Pending
                  </span>
                </td>
                <td className="p-3.5 sm:p-4 text-slate-500 text-xs hidden sm:table-cell whitespace-nowrap align-middle">Aug 26, 2026</td>
                <td className="p-3.5 sm:p-4 text-right whitespace-nowrap align-middle">
                  <Link to="/documents/sign/1" className="text-[#E71414] font-semibold hover:underline text-xs">
                    View & Send
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition">
                <td className="p-3.5 sm:p-4 font-semibold text-slate-900 align-middle">
                  <div className="flex items-start gap-2">
                    <FileCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="break-all sm:break-words leading-snug" title="Agreement.pdf">Agreement.pdf</span>
                  </div>
                </td>
                <td className="p-3.5 sm:p-4 text-slate-600 align-middle break-all leading-snug">
                  Sarah Connor (sarah@example.com)
                </td>
                <td className="p-3.5 sm:p-4 whitespace-nowrap align-middle">
                  <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full text-xs inline-block">
                    Completed
                  </span>
                </td>
                <td className="p-3.5 sm:p-4 text-slate-500 text-xs hidden sm:table-cell whitespace-nowrap align-middle">Aug 25, 2026</td>
                <td className="p-3.5 sm:p-4 text-right whitespace-nowrap align-middle">
                  <a href="#download" className="text-slate-600 font-semibold hover:underline text-xs">
                    Download
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
