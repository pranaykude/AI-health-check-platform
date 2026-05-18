import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getSupportMembers, 
  createSupportMember, 
  updateSupportMember, 
  deleteSupportMember,
  getWorkloads
} from '../api/supportMemberApi';
import useAuth from '../hooks/useAuth';

export default function SupportTeam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [members, setMembers] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal form state
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'support',
    department: '',
    designation: '',
    status: 'offline',
    skills: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await getSupportMembers(params);
      setMembers(res.data.supportMembers || []);

      if (isAdminOrManager) {
        const workRes = await getWorkloads();
        setWorkloads(workRes.data.workloads || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch team data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, isAdminOrManager]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Debounced search input
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleOpenCreate = () => {
    setEditingMember(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      role: 'support',
      department: '',
      designation: '',
      status: 'offline',
      skills: '',
    });
    setErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMember(m);
    setForm({
      fullName: m.fullName || '',
      email: m.email || '',
      phone: m.phone || '',
      role: m.role || 'support',
      department: m.department || '',
      designation: m.designation || '',
      status: m.status || 'offline',
      skills: m.skills ? m.skills.join(', ') : '',
    });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (editingMember) {
        await updateSupportMember(editingMember._id, payload);
        showToast('Team member updated successfully');
      } else {
        await createSupportMember(payload);
        showToast('Team member created successfully');
      }
      setShowForm(false);
      fetchTeamData();
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team member? All assigned clients will be safely unassigned.')) return;
    try {
      await deleteSupportMember(id);
      showToast('Team member deleted successfully');
      fetchTeamData();
    } catch (err) {
      showToast('Failed to delete team member', 'error');
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      support: 'Support Agent',
      senior_support: 'Senior Agent',
      technical_support: 'Tech Specialist',
      operations: 'Ops Lead',
      manager: 'Manager'
    };
    return roles[role] || role;
  };

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-secondary min-h-full">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl text-sm font-semibold shadow-2xl animate-slide-in border ${
            toast.type === 'error'
              ? 'bg-danger-50 border-danger-200 text-danger-600'
              : 'bg-success-50 border-success-200 text-success-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-danger-500' : 'bg-success-500'}`} />
            {toast.message}
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-text-primary tracking-tight bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Support Team Directory</h1>
          <p className="text-lg text-text-secondary mt-2">
            Monitor workloads, assigned clients, and real-time connectivity status.
          </p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Team Member
          </button>
        )}
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white border border-border-primary p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-sm font-semibold text-text-tertiary">Total Agents</span>
          <span className="text-3xl font-extrabold text-text-primary mt-2">{members.length}</span>
          <span className="text-xs text-text-tertiary mt-2">Active resources in catalog</span>
        </div>
        <div className="bg-white border border-border-primary p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-sm font-semibold text-text-tertiary">Online Status</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-success-600">
              {members.filter(m => m.status === 'online').length}
            </span>
            <span className="text-sm text-text-tertiary">online</span>
          </div>
          <span className="text-xs text-text-tertiary mt-2">Ready for routing calls</span>
        </div>
        <div className="bg-white border border-border-primary p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-sm font-semibold text-text-tertiary">Workload Assigned</span>
          <span className="text-3xl font-extrabold text-primary-600 mt-2">
            {members.reduce((sum, m) => sum + (m.assignedClients?.length || 0), 0)}
          </span>
          <span className="text-xs text-text-tertiary mt-2">Active client integrations</span>
        </div>
        <div className="bg-white border border-border-primary p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <span className="text-sm font-semibold text-text-tertiary">Avg Workload</span>
          <span className="text-3xl font-extrabold text-text-primary mt-2">
            {members.length > 0 
              ? (members.reduce((sum, m) => sum + (m.assignedClients?.length || 0), 0) / members.length).toFixed(1)
              : 0
            }
          </span>
          <span className="text-xs text-text-tertiary mt-2">Clients per active agent</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search agents by name, skills, designation..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer min-w-[180px]"
        >
          <option value="">All Roles</option>
          <option value="support">Support Agent</option>
          <option value="senior_support">Senior Support</option>
          <option value="technical_support">Technical Support</option>
          <option value="operations">Operations</option>
          <option value="manager">Manager</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-border-primary p-6 rounded-2xl shadow-sm animate-pulse space-y-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-bg-tertiary rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-bg-tertiary rounded w-3/4" />
                  <div className="h-4 bg-bg-tertiary rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-bg-tertiary rounded w-full" />
              <div className="h-8 bg-bg-tertiary rounded w-full" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white border border-border-primary rounded-2xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary">No team members found</h3>
          <p className="text-text-secondary mt-1 max-w-sm mx-auto">Try refining your search or adding a new team member to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {members.map((member, index) => (
            <div
              key={member._id}
              className="group relative bg-white border border-border-primary hover:border-primary-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Agent card details */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status avatar border */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 overflow-hidden flex items-center justify-center shadow-inner">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-primary-700">
                            {member.fullName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Pulse Status */}
                      <span className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-white ${
                        member.status === 'online'
                          ? 'bg-success-500 animate-pulse'
                          : member.status === 'busy'
                          ? 'bg-warning-500'
                          : 'bg-secondary-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text-primary group-hover:text-primary-600 transition-colors">
                        {member.fullName}
                      </h3>
                      <p className="text-xs font-semibold text-text-tertiary mt-0.5">
                        {member.designation || getRoleLabel(member.role)}
                      </p>
                    </div>
                  </div>

                  {/* Client Load Badge */}
                  <span className="inline-flex flex-col items-center px-3 py-1 bg-primary-50 rounded-xl border border-primary-200">
                    <span className="text-lg font-extrabold text-primary-700">
                      {member.assignedClients?.length || 0}
                    </span>
                    <span className="text-[9px] font-bold text-primary-500 uppercase tracking-wide">Clients</span>
                  </span>
                </div>

                {/* Subtitle metrics */}
                <div className="mt-5 space-y-2 text-sm">
                  {member.department && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="text-xs font-semibold text-text-tertiary w-20">Dept:</span>
                      <span className="font-medium">{member.department}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <span className="text-xs font-semibold text-text-tertiary w-20">Email:</span>
                      <span className="font-mono text-xs overflow-hidden text-ellipsis">{member.email}</span>
                    </div>
                  )}
                </div>

                {/* Skills array tags */}
                {member.skills && member.skills.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {member.skills.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-bg-secondary border border-border-primary rounded-lg text-[10px] font-bold text-text-secondary">
                        {s}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="px-2 py-1 bg-bg-secondary border border-border-primary rounded-lg text-[10px] font-bold text-text-tertiary">
                        +{member.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-6 pt-4 border-t border-border-primary flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/support-team/${member._id}`)}
                  className="flex-1 py-2 text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100 hover:bg-primary-100 rounded-xl text-center transition-all cursor-pointer"
                >
                  View Workspace
                </button>

                {isAdminOrManager && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 text-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all cursor-pointer"
                      title="Edit Agent Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(member._id)}
                      className="p-2 text-text-tertiary hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-all cursor-pointer"
                      title="Remove Agent"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Team Member Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowForm(false)} />

          <div className="flex min-h-full items-start justify-center px-4 py-8">
            <div className="relative w-full max-w-xl bg-white border border-border-primary rounded-2xl shadow-2xl animate-scale-in">
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 border-b border-border-primary rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {editingMember ? 'Modify configuration parameters' : 'Onboard a new support member into the system'}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {errors.form && (
                <div className="mx-6 mt-4 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
                  {errors.form}
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Full Name <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Emma Stone"
                    className={`w-full px-4 py-2.5 bg-white border rounded-xl text-text-primary focus:outline-none focus:ring-2 ${
                      errors.fullName
                        ? 'border-danger-500 focus:ring-danger-500/30'
                        : 'border-border-primary focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-danger-600">{errors.fullName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">
                      Email Address <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="emma@example.com"
                      className={`w-full px-4 py-2.5 bg-white border rounded-xl text-text-primary focus:outline-none focus:ring-2 ${
                        errors.email
                          ? 'border-danger-500 focus:ring-danger-500/30'
                          : 'border-border-primary focus:ring-primary-500/20 focus:border-primary-500'
                      }`}
                    />
                    {errors.email && <p className="mt-1 text-xs text-danger-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Designation</label>
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="Senior Success Executive"
                      className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Department</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Healthcare Support"
                      className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Role Permission</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none"
                    >
                      <option value="support">Support Agent</option>
                      <option value="senior_support">Senior Support</option>
                      <option value="technical_support">Technical Support</option>
                      <option value="operations">Operations Lead</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none"
                    >
                      <option value="online">Online</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="Express, Client Success, Telephony, Billing"
                    className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-md shadow-primary-500/20 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingMember ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
