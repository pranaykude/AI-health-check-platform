import { useState, useEffect } from 'react';

const INITIAL_FORM = {
  name: '',
  phone: '',
  language: 'en',
  product: '',
  email: '',
  address: '',
  status: 'active',
  notes: '',
};

export default function ClientForm({ isOpen, onClose, onSubmit, client }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        phone: client.phone || '',
        language: client.language || 'en',
        product: client.product || '',
        email: client.email || '',
        address: client.address || '',
        status: client.status || 'active',
        notes: client.notes || '',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [client, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\+?[\d\s\-]{10,15}$/.test(form.phone.replace(/[\s\-]/g, ''))) {
      newErrors.phone = 'Phone must be 10-15 digits';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm(INITIAL_FORM);
      onClose();
    } catch (err) {
      if (err.message) {
        setErrors({ form: err.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal wrapper */}
      <div className="flex min-h-full items-start justify-center px-4 py-8">
        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white border border-border-primary rounded-2xl shadow-2xl shadow-black/10 animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-border-primary rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {isEditing ? 'Edit Client' : 'Add New Client'}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {isEditing ? 'Update client information' : 'Fill in the details to create a new client'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Error */}
        {errors.form && (
          <div className="mx-6 mt-4 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
            {errors.form}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row: Name + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Name <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Doe"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.name
                    ? 'border-danger-500 focus:ring-danger-500/30'
                    : 'border-border-primary focus:ring-primary-500/20 focus:border-primary-500'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-danger-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Phone <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 9876543210"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.phone
                    ? 'border-danger-500 focus:ring-danger-500/30'
                    : 'border-border-primary focus:ring-primary-500/20 focus:border-primary-500'
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-danger-600">{errors.phone}</p>}
            </div>
          </div>

          {/* Row: Email + Product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.email
                    ? 'border-danger-500 focus:ring-danger-500/30'
                    : 'border-border-primary focus:ring-primary-500/20 focus:border-primary-500'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-danger-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Product</label>
              <input
                type="text"
                value={form.product}
                onChange={(e) => handleChange('product', e.target.value)}
                placeholder="Health insurance plan"
                className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Row: Language + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Language</label>
              <select
                value={form.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street, City, Country"
              className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about the client..."
              className="w-full px-4 py-2.5 bg-white border border-border-primary rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary hover:text-text-primary transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-md shadow-primary-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : isEditing ? (
                'Update Client'
              ) : (
                'Create Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
