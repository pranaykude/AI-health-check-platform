import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as supportApi from '../api/supportMemberApi';
import * as clientApi from '../api/clientApi';

export default function SupportTeam() {
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [modalSearch, setModalSearch] = useState('');

  // Add Member Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'support',
    department: '',
    designation: '',
    status: 'online',
    skills: '',
  });

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, clientsRes] = await Promise.all([
        supportApi.getSupportMembers(),
        clientApi.getClients({ limit: 1000 })
      ]);
      setMembers(membersRes.data || []);
      setClients(clientsRes.data?.clients || []);
    } catch (err) {
      setError(err.message || 'Failed to load support team directory');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    // Format skills to array
    const skillsArray = formData.skills
      ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      await supportApi.createSupportMember({
        ...formData,
        skills: skillsArray
      });
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        role: 'support',
        department: '',
        designation: '',
        status: 'online',
        skills: '',
      });
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to create support member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssignModal = (member) => {
    setSelectedMember(member);
    // Pre-populate with currently assigned client IDs
    setSelectedClients(member.assignedClients.map(c => typeof c === 'object' ? c._id : c));
    setModalSearch('');
    setIsAssignModalOpen(true);
  };

  const handleToggleClientSelection = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      await supportApi.assignClientsToMember(selectedMember._id, selectedClients);
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save assignments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to remove this support member? All their assigned clients will be safely unassigned.')) {
      return;
    }
    try {
      await supportApi.deleteSupportMember(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete support member');
    }
  };

  // Filtered members
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (member.department && member.department.toLowerCase().includes(search.toLowerCase())) ||
      (member.skills && member.skills.some(skill => skill.toLowerCase().includes(search.toLowerCase())));
    const matchesRole = roleFilter ? member.role === roleFilter : true;
    const matchesStatus = statusFilter ? member.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Stats computation
  const totalMembers = members.length;
  const onlineMembers = members.filter(m => m.status === 'online').length;
  const busyMembers = members.filter(m => m.status === 'busy').length;
  const totalAssignments = members.reduce((sum, m) => sum + (m.assignedClients?.length || 0), 0);
  const avgWorkload = totalMembers > 0 ? (totalAssignments / totalMembers).toFixed(1) : 0;

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Support Workspace</h1>
          <p className="text-text-tertiary mt-1">Manage corporate accounts, success managers, and system workload limits.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-primary-500/10 transition-all active:scale-95 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Success Specialist
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white border border-border-primary p-6 rounded-2xl flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:border-primary-100">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-tertiary">Total Team</p>
            <h3 className="text-2xl font-bold text-text-primary mt-0.5">{totalMembers}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-border-primary p-6 rounded-2xl flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:border-success-100">
          <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center text-success-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 117.07 0M12 11a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-tertiary">Active / Online</p>
            <h3 className="text-2xl font-bold text-success-600 mt-0.5">{onlineMembers}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-border-primary p-6 rounded-2xl flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:border-warning-100">
          <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center text-warning-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-tertiary">In Live Call / Busy</p>
            <h3 className="text-2xl font-bold text-warning-600 mt-0.5">{busyMembers}</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-border-primary p-6 rounded-2xl flex items-center gap-5 shadow-sm transition-all hover:shadow-md hover:border-primary-100">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-tertiary">Average Workload</p>
            <h3 className="text-2xl font-bold text-text-primary mt-0.5">{avgWorkload} <span className="text-xs text-text-tertiary font-normal">clients/spec</span></h3>
          </div>
        </div>
      </div>

      {/* Filters & Control bar */}
      <div className="bg-white p-5 rounded-2xl border border-border-primary flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, department, skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-secondary border border-border-primary rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-bg-secondary border border-border-primary text-text-secondary font-medium px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all w-full sm:w-auto"
          >
            <option value="">All Roles</option>
            <option value="support">Support Specialist</option>
            <option value="senior_support">Senior Lead</option>
            <option value="technical_support">Technical Specialist</option>
            <option value="operations">Operations Manager</option>
            <option value="manager">Success Manager</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-secondary border border-border-primary text-text-secondary font-medium px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-transparent">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-danger-50 border border-danger-100 text-danger-700 p-5 rounded-2xl text-center font-medium shadow-sm">
          ⚠️ {error}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white border border-border-primary text-text-tertiary p-12 rounded-3xl text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h4 className="text-lg font-bold text-text-primary">No team members found</h4>
          <p className="text-sm mt-1">Try resetting your filters or adjusting your search queries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMembers.map((member) => (
            <div
              key={member._id}
              className="bg-white rounded-3xl border border-border-primary shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group overflow-hidden relative"
            >
              {/* Dynamic Status Bar Accent */}
              <div className={`h-1.5 w-full ${
                member.status === 'online' ? 'bg-success-500' :
                member.status === 'busy' ? 'bg-warning-500' :
                'bg-slate-300'
              }`}></div>

              <div className="p-6 space-y-5">
                {/* Member Info Header */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.fullName}
                        className="w-14 h-14 rounded-2xl object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xl uppercase border border-primary-100 shadow-inner">
                        {member.fullName.charAt(0)}
                      </div>
                    )}
                    {/* Live Occupancy Status Dot */}
                    <span className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-3 border-white shadow-sm flex items-center justify-center ${
                      member.status === 'online' ? 'bg-success-500' :
                      member.status === 'busy' ? 'bg-warning-500' :
                      'bg-slate-400'
                    }`}>
                      {member.status === 'online' && <span className="absolute w-2 h-2 bg-white rounded-full animate-ping"></span>}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text-primary truncate group-hover:text-primary-600 transition-colors">
                      {member.fullName}
                    </h3>
                    <p className="text-xs text-text-tertiary font-semibold truncate uppercase mt-0.5">
                      {member.designation || 'Specialist'}
                    </p>
                    <p className="text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-full inline-block mt-2">
                      💼 {member.department || 'Healthcare'}
                    </p>
                  </div>
                </div>

                {/* Subdetails */}
                <div className="space-y-2 text-sm text-text-secondary border-t border-border-primary pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary font-medium">Assigned Workload:</span>
                    <span className="font-bold text-text-primary bg-bg-secondary px-3 py-1 rounded-lg border border-border-primary text-xs">
                      {member.assignedClients?.length || 0} clients
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary font-medium">Email:</span>
                    <span className="font-semibold text-text-primary text-xs truncate max-w-44">{member.email}</span>
                  </div>
                </div>

                {/* Skills tags */}
                {member.skills && member.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-text-tertiary tracking-wide uppercase">Core Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.skills.map((skill, index) => (
                        <span key={index} className="bg-bg-secondary text-text-secondary border border-border-primary px-2.5 py-0.5 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="bg-bg-secondary border-t border-border-primary p-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOpenAssignModal(member)}
                  className="flex items-center justify-center gap-1.5 bg-white border border-border-primary hover:border-primary-300 text-text-secondary hover:text-primary-600 font-bold px-3 py-2.5 rounded-xl text-xs shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Assign Clients
                </button>
                <Link
                  to={`/support-team/${member._id}`}
                  className="flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs shadow-md shadow-primary-500/5 hover:shadow-primary-500/10 active:scale-95 transition-all text-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Profile
                </Link>
                <button
                  onClick={() => handleDeleteMember(member._id)}
                  className="col-span-2 flex items-center justify-center gap-1.5 text-red-600 hover:bg-red-50 font-bold px-3 py-2 rounded-xl text-xs transition-all border border-transparent hover:border-red-100 cursor-pointer active:scale-95 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Dissociate & Delete Member
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD SUCCESS SPECIALIST */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border-primary animate-scale-in">
            {/* Header */}
            <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
              <h2 className="text-xl font-bold text-text-primary">Add Success Specialist</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary p-2 hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateMember} className="p-6 space-y-6">
              {formError && (
                <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3 rounded-xl text-sm font-medium">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                    placeholder="jane@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                    placeholder="+91..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Access Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-secondary font-semibold"
                  >
                    <option value="support">Support Specialist</option>
                    <option value="senior_support">Senior Support</option>
                    <option value="technical_support">Technical Support</option>
                    <option value="operations">Operations</option>
                    <option value="manager">Success Manager</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                    placeholder="e.g. Healthcare Accounts"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Corporate Title</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                    placeholder="e.g. Lead Specialist"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Core Skills (Comma separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  className="w-full bg-bg-secondary border border-border-primary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                  placeholder="e.g. Escalation handling, Patient Care, Twilio"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-border-primary hover:bg-bg-secondary text-text-secondary font-bold text-sm transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Register Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN CLIENTS */}
      {isAssignModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-border-primary animate-scale-in">
            {/* Header */}
            <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Assign Corporate Clients</h2>
                <p className="text-xs text-text-tertiary font-medium mt-0.5">Assign accounts to <strong className="text-text-primary">{selectedMember.fullName}</strong></p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-text-tertiary hover:text-text-primary p-2 hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List of Clients (Scrollable container) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedClients.length > 50 && (
                <div className="bg-danger-50 border border-danger-100 text-danger-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-start gap-2 shadow-sm animate-pulse">
                  <span>⚠️ Warning: Workload threshold exceeded! This support specialist has {selectedClients.length} assigned clients. The recommended enterprise maximum is 50.</span>
                </div>
              )}

              {/* Search Bar inside Modal */}
              <div className="relative">
                <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter registered clients by name, email, phone..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-bg-secondary border border-border-primary rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-text-primary font-medium"
                />
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-text-tertiary uppercase tracking-wide px-1">
                <span>Select Clients to Assign</span>
                <span>{selectedClients.length} Selected</span>
              </div>
              
              {clients.length === 0 ? (
                <p className="text-sm text-text-tertiary py-8 text-center">No clients registered in the system yet.</p>
              ) : (
                <div className="space-y-2">
                  {clients
                    .filter((client) => {
                      const term = modalSearch.toLowerCase();
                      return (
                        client.name.toLowerCase().includes(term) ||
                        (client.email && client.email.toLowerCase().includes(term)) ||
                        (client.phone && client.phone.includes(term))
                      );
                    })
                    .map((client) => {
                      const isChecked = selectedClients.includes(client._id);
                      return (
                        <div
                          key={client._id}
                          onClick={() => handleToggleClientSelection(client._id)}
                          className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all cursor-pointer hover:border-primary-300 ${
                            isChecked 
                              ? 'bg-primary-50/50 border-primary-300 shadow-sm' 
                              : 'bg-white border-border-primary'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isChecked ? 'bg-primary-600 border-primary-600 text-white' : 'border-border-secondary bg-white'
                          }`}>
                            {isChecked && (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate">{client.name}</p>
                            <p className="text-xs text-text-tertiary truncate">{client.email || 'No email'} | {client.phone}</p>
                          </div>
                          {client.assignedSupportMember && client.assignedSupportMember !== selectedMember._id && (
                            <span className="text-[10px] font-bold text-warning-700 bg-warning-50 border border-warning-100 px-2 py-0.5 rounded-md self-center">
                              Reassigns
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-border-primary flex justify-end gap-3 bg-bg-secondary rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-5 py-3 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary font-bold text-sm transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Confirm Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
