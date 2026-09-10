import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Award,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Key,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Briefcase,
  Mail,
  Lock,
  Phone,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  History
} from 'lucide-react';
import { showPopupAlert } from '../components/GlobalAlertModal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    managers: 0,
    leaders: 0,
    teamMembers: 0,
    active: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'team_member',
    department: 'Operations',
    designation: 'Team Member',
    password: 'Password@123',
    phone: ''
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetConfirmPasswordVal, setResetConfirmPasswordVal] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [resetSendEmail, setResetSendEmail] = useState(true);
  const [resetError, setResetError] = useState('');

  const generateResetStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = 'Bex#';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordVal(generated);
    setResetConfirmPasswordVal(generated);
    setShowResetPass(true);
    setShowResetConfirmPass(true);
    setResetError('');
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn('Users fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
      }
    } catch (e) {}
  };

  const fetchLoginLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/login-logs');
      const data = await res.json();
      if (data.success) {
        setLoginLogs(data.logs || []);
        setShowLogsModal(true);
      }
    } catch (e) {
      showPopupAlert('Failed to fetch login logs', { type: 'error' });
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || fullName.includes(query) || email.includes(query) || dept.includes(query);
      const matchesRole = roleFilter === 'all' || (u.role || '').toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || (u.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      showPopupAlert('Please provide a valid email address.', { type: 'error' });
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        showPopupAlert(data.message || 'User created successfully!', { type: 'success', title: 'User Added' });
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'team_member',
          department: 'Operations',
          designation: 'Team Member',
          password: 'Password@123',
          phone: ''
        });
        fetchUsers();
      } else {
        showPopupAlert(data.error || 'Failed to create user', { type: 'error' });
      }
    } catch (err) {
      showPopupAlert('Failed to connect to backend server', { type: 'error' });
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!activeUser) return;

    try {
      const res = await fetch(`http://localhost:5000/api/users/${activeUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: activeUser.first_name,
          lastName: activeUser.last_name,
          role: activeUser.role,
          department: activeUser.department,
          designation: activeUser.designation,
          phone: activeUser.phone
        })
      });
      const data = await res.json();

      if (data.success) {
        showPopupAlert('User profile and permissions updated successfully!', { type: 'success', title: 'Profile Updated' });
        setShowEditModal(false);
        setActiveUser(null);
        fetchUsers();
      } else {
        showPopupAlert(data.error || 'Failed to update user', { type: 'error' });
      }
    } catch (err) {
      showPopupAlert('Failed to update user profile', { type: 'error' });
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        showPopupAlert(`User account status updated to ${newStatus}.`, { type: 'info', title: 'Status Changed' });
        fetchUsers();
      } else {
        showPopupAlert(data.error || 'Failed to update status', { type: 'error' });
      }
    } catch (err) {
      showPopupAlert('Failed to communicate with server', { type: 'error' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!activeUser || !resetPasswordVal) return;

    if (resetPasswordVal.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (resetPasswordVal !== resetConfirmPasswordVal) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/users/${activeUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newPassword: resetPasswordVal,
          sendEmail: resetSendEmail
        })
      });
      const data = await res.json();

      if (data.success) {
        showPopupAlert(
          data.message || `Password reset successfully for ${activeUser.email}.`, 
          { type: 'success', title: 'Password Updated' }
        );
        setShowResetModal(false);
        setResetPasswordVal('');
        setResetConfirmPasswordVal('');
        setActiveUser(null);
      } else {
        setResetError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setResetError('Failed to reset password due to network error.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.first_name} ${user.last_name} (${user.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        showPopupAlert('User removed successfully from workspace.', { type: 'success', title: 'User Deleted' });
        fetchUsers();
      } else {
        showPopupAlert(data.error || 'Failed to delete user', { type: 'error' });
      }
    } catch (err) {
      showPopupAlert('Failed to delete user', { type: 'error' });
    }
  };

  // Role Badge Helper
  const renderRoleBadge = (roleKey) => {
    const normalized = (roleKey || 'team_member').toLowerCase();
    if (normalized === 'manager' || normalized === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck size={13} className="text-purple-600" />
          Manager (Admin)
        </span>
      );
    }
    if (normalized === 'leader') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Award size={13} className="text-blue-600" />
          Leader
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Users size={13} className="text-slate-500" />
        Team Member
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 text-slate-800 overflow-y-auto font-sans p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#007355]/10 border border-[#007355]/20 flex items-center justify-center text-[#007355]">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Users & Access Management</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage organization team members, assign managerial & leader permissions, and monitor access.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPermissionsModal(true)}
            className="px-3.5 py-2 border border-slate-300 hover:bg-white bg-slate-100/80 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-xs cursor-pointer"
            title="View Role Capabilities & Permissions Matrix"
          >
            <HelpCircle size={15} className="text-slate-500" />
            <span>Role Permissions</span>
          </button>
          <button
            onClick={fetchLoginLogs}
            className="px-3.5 py-2 border border-slate-300 hover:bg-white bg-slate-100/80 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-xs cursor-pointer"
            title="View Enterprise Login Audit Records"
          >
            <History size={15} className="text-slate-500" />
            <span>Login Audit</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Managers (Admin)</p>
            <h3 className="text-2xl font-black text-purple-900 mt-0.5">{stats.managers}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Leaders</p>
            <h3 className="text-2xl font-black text-blue-900 mt-0.5">{stats.leaders}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Award size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Members</p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">{stats.teamMembers}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Status</p>
            <h3 className="text-2xl font-black text-emerald-900 mt-0.5">{stats.active}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, department..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#007355] focus:ring-1 focus:ring-[#007355] bg-slate-50/50"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#007355]"
            >
              <option value="all">All Roles ({stats.total})</option>
              <option value="manager">Managers ({stats.managers})</option>
              <option value="leader">Leaders ({stats.leaders})</option>
              <option value="team_member">Team Members ({stats.teamMembers})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#007355]"
            >
              <option value="all">All Status</option>
              <option value="active">Active ({stats.active})</option>
              <option value="inactive">Inactive ({stats.inactive})</option>
            </select>
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition"
            title="Refresh Users List"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Department & Designation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#007355]" />
                    <p className="text-xs font-semibold">Loading enterprise users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold text-slate-600">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const initials = `${(user.first_name || 'U')[0]}${(user.last_name || 'M')[0]}`.toUpperCase();
                  const isPrimaryAdmin = user.id === 1;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ${
                            user.role === 'manager' ? 'bg-gradient-to-tr from-purple-600 to-indigo-500' : (user.role === 'leader' ? 'bg-gradient-to-tr from-blue-600 to-cyan-500' : 'bg-gradient-to-tr from-slate-600 to-slate-500')
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              {isPrimaryAdmin && (
                                <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black rounded uppercase">
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] truncate font-mono mt-0.5">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderRoleBadge(user.role)}
                      </td>

                      {/* Department & Designation */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{user.designation || 'Member'}</p>
                        <p className="text-slate-400 text-[11px]">{user.department || 'General'}</p>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => !isPrimaryAdmin && handleToggleStatus(user)}
                          disabled={isPrimaryAdmin}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          } ${isPrimaryAdmin ? 'opacity-80 cursor-not-allowed' : ''}`}
                          title={isPrimaryAdmin ? 'Primary admin cannot be deactivated' : `Click to toggle ${user.status === 'active' ? 'Deactivate' : 'Activate'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never logged in'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveUser({ ...user });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Edit User Details & Role"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveUser(user);
                              setResetPasswordVal('');
                              setShowResetModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Reset Password"
                          >
                            <Key size={14} />
                          </button>

                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#007355]/10 text-[#007355] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Organization Member</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. John"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@company.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assigned Role & Privileges *</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setFormData({ ...formData, role: 'manager' })}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col items-center text-center space-y-1 ${
                      formData.role === 'manager'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900 shadow-xs ring-2 ring-purple-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <ShieldCheck size={20} className={formData.role === 'manager' ? 'text-purple-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold">Manager</span>
                    <span className="text-[9px] text-slate-500 leading-tight">All Admin Access</span>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, role: 'leader' })}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col items-center text-center space-y-1 ${
                      formData.role === 'leader'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs ring-2 ring-blue-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Award size={20} className={formData.role === 'leader' ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="text-xs font-bold">Leader</span>
                    <span className="text-[9px] text-slate-500 leading-tight">Team Management</span>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, role: 'team_member' })}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col items-center text-center space-y-1 ${
                      formData.role === 'team_member'
                        ? 'border-slate-500 bg-slate-100 text-slate-900 shadow-xs ring-2 ring-slate-300'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Users size={20} className={formData.role === 'team_member' ? 'text-slate-700' : 'text-slate-400'} />
                    <span className="text-xs font-bold">Team Member</span>
                    <span className="text-[9px] text-slate-500 leading-tight">Standard User</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Legal, Finance, Operations"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Officer, Lead"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set password for first login"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#007355]"
                />
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Create & Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User */}
      {showEditModal && activeUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit User Details & Role</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    value={activeUser.first_name || ''}
                    onChange={(e) => setActiveUser({ ...activeUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={activeUser.last_name || ''}
                    onChange={(e) => setActiveUser({ ...activeUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Role Assignment</label>
                <select
                  value={activeUser.role || 'team_member'}
                  onChange={(e) => setActiveUser({ ...activeUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#007355]"
                >
                  <option value="manager">Manager (Admin - All Access)</option>
                  <option value="leader">Leader (Team Management)</option>
                  <option value="team_member">Team Member (Standard User)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={activeUser.department || ''}
                    onChange={(e) => setActiveUser({ ...activeUser, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    value={activeUser.designation || ''}
                    onChange={(e) => setActiveUser({ ...activeUser, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password */}
      {showResetModal && activeUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#007355] flex items-center justify-center">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Change User Password</h3>
                  <p className="text-[11px] text-slate-500">Manager override credentials</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{activeUser.first_name} {activeUser.last_name}</p>
                <p className="text-[11px] text-slate-500">{activeUser.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                {activeUser.role || 'Member'}
              </span>
            </div>

            {resetError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              {/* Auto Generate Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={generateResetStrongPassword}
                  className="text-[11px] font-bold text-[#007355] hover:underline flex items-center gap-1.5"
                >
                  <Sparkles size={13} /> Auto Generate Strong Password
                </button>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={resetPasswordVal}
                    onChange={(e) => { setResetPasswordVal(e.target.value); setResetError(''); }}
                    placeholder="Enter or generate password"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResetPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">Confirm Password *</label>
                  {resetConfirmPasswordVal && (
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${resetPasswordVal === resetConfirmPasswordVal ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {resetPasswordVal === resetConfirmPasswordVal ? <Check size={11} /> : null}
                      {resetPasswordVal === resetConfirmPasswordVal ? 'Match' : 'Mismatch'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showResetConfirmPass ? 'text' : 'password'}
                    required
                    value={resetConfirmPasswordVal}
                    onChange={(e) => { setResetConfirmPasswordVal(e.target.value); setResetError(''); }}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-[#007355]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResetConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Send email checkbox */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetSendEmail}
                  onChange={(e) => setResetSendEmail(e.target.checked)}
                  className="rounded border-slate-300 text-[#007355] focus:ring-[#007355]"
                />
                <span className="text-[11px] text-slate-600 font-medium">
                  Send new credentials notification to <strong className="text-slate-800">{activeUser.email}</strong>
                </span>
              </label>

              <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#007355] hover:bg-[#005c44] text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Role Permissions Matrix */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#007355]" />
                <h3 className="text-base font-bold text-slate-900">Enterprise Role & Permissions Matrix</h3>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-4">Feature / Capability</th>
                    <th className="py-2.5 px-4 text-center text-purple-700">Manager (Admin)</th>
                    <th className="py-2.5 px-4 text-center text-blue-700">Leader</th>
                    <th className="py-2.5 px-4 text-center text-slate-700">Team Member</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">User Management (Add, Edit, Delete, Roles)</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-slate-400">View Team Only</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">Manage All Organization Documents</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-blue-600 font-semibold">Team Documents</td>
                    <td className="py-2 px-4 text-center text-slate-600">Own Documents</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">Delete & Restore Documents / Trash</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-blue-600 font-semibold">Own/Team Only</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">Create & Share Templates</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-blue-600 font-semibold">Full Access</td>
                    <td className="py-2 px-4 text-center text-slate-600">Use Templates</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">System Settings & Integrations</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold text-slate-800">View Enterprise Login & Audit Logs</td>
                    <td className="py-2 px-4 text-center text-purple-600 font-bold">Full Access</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                    <td className="py-2 px-4 text-center text-slate-300">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 bg-[#007355] text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Login Audit Logs */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans text-slate-900">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[#007355]" />
                <h3 className="text-base font-bold text-slate-900">Enterprise Login Audit Trail</h3>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">IP Address</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {loginLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-sans">
                        No login events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">
                          {log.email}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-sans font-bold text-[10px] uppercase text-slate-600">
                            {log.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-bold">
                          {log.status === 'success' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                              Success
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(log.login_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
