import { useState, useEffect, useCallback } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../api/clientApi';
import { triggerCall } from '../services/callService';
import ClientForm from '../components/ClientForm';
import DeleteConfirm from '../components/DeleteConfirm';
import ImportModal from '../components/ImportModal';
import ScheduleModal from '../components/ScheduleModal';
import { createSchedule } from '../api/scheduleApi';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [callingId, setCallingId] = useState(null);
  const [scheduleTarget, setScheduleTarget] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (languageFilter) params.language = languageFilter;

      const res = await getClients(params);
      setClients(res.data.clients);
      setPagination(res.data.pagination);
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, languageFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = async (data) => {
    try {
      await createClient(data);
      showToast('Client created successfully');
      fetchClients();
    } catch (err) {
      showToast('Something went wrong', 'error');
      throw err;
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateClient(editingClient._id, data);
      showToast('Client updated successfully');
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      showToast('Something went wrong', 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient(deleteTarget._id);
      showToast('Client deleted successfully');
      setDeleteTarget(null);
      fetchClients();
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCall = async (clientId) => {
    setCallingId(clientId);
    try {
      await triggerCall(clientId);
      showToast('Call triggered');
    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      setCallingId(null);
    }
  };

  const handleSchedule = async (scheduleData) => {
    try {
      await createSchedule({
        clientId: scheduleTarget._id,
        ...scheduleData
      });
      showToast('Call scheduled successfully');
    } catch (err) {
      showToast('Failed to schedule call', 'error');
    }
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  return (
    <div className="p-8 lg:p-10 animate-fade-in bg-bg-primary min-h-full">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl text-sm font-medium shadow-lg animate-slide-in border ${
            toast.type === 'error'
              ? 'bg-danger-50 border-danger-200 text-danger-600'
              : 'bg-success-50 border-success-200 text-success-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-text-primary">Clients</h1>
          <p className="text-lg text-text-secondary mt-2">
            Manage your client database
            {pagination.total !== undefined && (
              <span className="text-text-tertiary"> · {pagination.total} total</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>
          <button
            id="add-client-btn"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-md shadow-primary-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-clients"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone, or product..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
          />
        </div>

        {/* Status filter */}
        <select
          id="filter-status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Language filter */}
        <select
          id="filter-language"
          value={languageFilter}
          onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-border-primary rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Product</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Language</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-32 mb-2"></div><div className="h-3 bg-bg-tertiary rounded w-24"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-28"></div></td>
                    <td className="px-6 py-6"><div className="h-4 bg-bg-tertiary rounded w-24"></div></td>
                    <td className="px-6 py-6"><div className="h-6 bg-bg-tertiary rounded-lg w-16"></div></td>
                    <td className="px-6 py-6"><div className="h-6 bg-bg-tertiary rounded-lg w-20"></div></td>
                    <td className="px-6 py-6 text-right"><div className="h-8 bg-bg-tertiary rounded-lg w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : clients?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-bg-secondary flex items-center justify-center">
                        <svg className="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-text-secondary font-medium text-lg">No clients found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients?.map((client, index) => (
                  <tr
                    key={client._id}
                    className="hover:bg-bg-secondary transition-colors duration-150"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-text-primary">{client.name}</p>
                        {client.email && (
                          <p className="text-xs text-text-tertiary mt-0.5">{client.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono text-xs">
                      {client.phone}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {client.product || <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        client.language === 'en'
                          ? 'bg-primary-50 text-primary-600 border-primary-200'
                          : 'bg-warning-50 text-warning-600 border-warning-200'
                      }`}>
                        {client.language === 'en' ? 'English' : 'Hindi'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        client.status === 'active'
                          ? 'bg-success-50 text-success-600 border-success-200'
                          : 'bg-bg-secondary text-text-tertiary border-border-secondary'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          client.status === 'active' ? 'bg-success-500' : 'bg-text-tertiary'
                        }`} />
                        {client.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCall(client._id)}
                          disabled={callingId === client._id}
                          className={`btn-call-now flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                            callingId === client._id
                              ? 'text-primary-400 bg-primary-50 cursor-wait'
                              : 'text-success-600 bg-success-50 hover:bg-success-100 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {callingId === client._id ? 'Calling...' : 'Call Now'}
                        </button>
                        <button
                          onClick={() => setScheduleTarget(client)}
                          className="flex items-center gap-1.5 p-2 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Schedule
                        </button>
                        <button
                          onClick={() => openEdit(client)}
                          className="p-2 rounded-lg text-text-tertiary hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(client)}
                          className="p-2 rounded-lg text-text-tertiary hover:text-danger-600 hover:bg-danger-50 transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-5 border-t border-border-primary">
            <p className="text-sm text-text-tertiary">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-lg hover:bg-bg-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-lg hover:bg-bg-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ClientForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingClient(null); }}
        onSubmit={editingClient ? handleUpdate : handleCreate}
        client={editingClient}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchClients}
        showToast={showToast}
      />

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        clientName={deleteTarget?.name}
        deleting={deleting}
      />

      <ScheduleModal
        isOpen={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        onConfirm={handleSchedule}
        clientName={scheduleTarget?.name}
      />
    </div>
  );
}
