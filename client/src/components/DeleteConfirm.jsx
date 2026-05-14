export default function DeleteConfirm({ isOpen, onClose, onConfirm, clientName, deleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-white border border-border-primary rounded-2xl shadow-2xl shadow-black/10 animate-scale-in p-6">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-text-primary text-center mb-2">Delete Client</h3>
        <p className="text-text-secondary text-center text-sm mb-6">
          Are you sure you want to delete{' '}
          <span className="text-text-primary font-medium">{clientName}</span>?
          This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-white border border-border-primary rounded-xl hover:bg-bg-secondary hover:text-text-primary transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-danger-500 to-danger-400 rounded-xl hover:from-danger-400 hover:to-danger-400 shadow-md shadow-danger-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
