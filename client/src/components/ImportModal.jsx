import { useState, useRef } from 'react';
import { uploadClients } from '../api/clientApi';

export default function ImportModal({ isOpen, onClose, onSuccess, showToast }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isExcelOrCsv = 
      fileName.endsWith('.csv') || 
      fileName.endsWith('.xlsx') || 
      fileName.endsWith('.xls') ||
      selectedFile.type === 'text/csv' ||
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (isExcelOrCsv) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    } else {
      setError('Please select a valid CSV or Excel file (.csv, .xlsx)');
      e.target.value = null;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);
    
    try {
      const res = await uploadClients(file);
      setResult(res.data);
      if (res.data.inserted > 0) {
        onSuccess();
      }
      showToast('Upload completed successfully');
    } catch (err) {
      setError(err.message || 'Upload failed. Check errors.');
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    onClose();
  };

  const startNew = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-secondary-200">
        {/* Header - Fixed */}
        <div className="px-8 py-6 border-b border-secondary-100 flex justify-between items-start bg-secondary-50/50 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-secondary-900 tracking-tight">Upload Client Data</h2>
            <p className="text-sm text-secondary-500 mt-1 font-semibold">Batch ingest clients from CSV or Excel</p>
          </div>
          <button 
            onClick={reset} 
            className="p-2 hover:bg-secondary-200/50 rounded-full transition-all duration-200 text-secondary-400 hover:text-secondary-600 -mr-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="px-8 py-6 overflow-y-auto flex-grow custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-100 text-danger-600 rounded-2xl text-sm font-bold flex items-start gap-3 animate-slide-in">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <div className="space-y-6">
              {/* Dropzone area */}
              <div 
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-[32px] p-10 text-center cursor-pointer transition-all duration-300 ${
                  file 
                    ? 'border-primary-500 bg-primary-50/40 shadow-inner' 
                    : 'border-secondary-200 hover:border-primary-400 hover:bg-secondary-50'
                } ${uploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  disabled={uploading}
                />
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 transition-all duration-500 shadow-sm ${
                    file ? 'bg-primary-500 text-white rotate-0' : 'bg-secondary-100 text-secondary-400 group-hover:scale-110 group-hover:bg-primary-50 group-hover:text-primary-400'
                  }`}>
                    {file ? (
                      <svg className="w-10 h-10 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-secondary-900 font-black text-xl">
                    {file ? file.name : 'Choose a file'}
                  </p>
                  <p className="text-secondary-500 text-sm mt-2 font-semibold">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag and drop or click to browse'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-secondary-900 p-6 rounded-[28px] flex justify-between items-center shadow-xl shadow-secondary-900/10">
                  <div>
                    <p className="text-secondary-400 text-[10px] font-black uppercase tracking-[0.2em]">Total Records Processed</p>
                    <p className="text-4xl font-black text-white mt-1">{result.total}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                
                <div className="bg-success-50 p-5 rounded-[24px] border border-success-100 flex flex-col items-center text-center">
                  <p className="text-success-600 text-[10px] font-black uppercase tracking-wider">Inserted</p>
                  <p className="text-2xl font-black text-success-700 mt-1">{result.inserted}</p>
                </div>

                <div className="bg-danger-50 p-5 rounded-[24px] border border-danger-100 flex flex-col items-center text-center">
                  <p className="text-danger-600 text-[10px] font-black uppercase tracking-wider">Failed</p>
                  <p className="text-2xl font-black text-danger-700 mt-1">{result.failed}</p>
                </div>

                <div className="bg-warning-50 p-5 rounded-[24px] border border-warning-100 flex flex-col items-center text-center">
                  <p className="text-warning-600 text-[10px] font-black uppercase tracking-wider">Duplicates</p>
                  <p className="text-2xl font-black text-warning-700 mt-1">{result.duplicates}</p>
                </div>

                <div className="bg-secondary-50 p-5 rounded-[24px] border border-secondary-100 flex flex-col items-center text-center">
                  <p className="text-secondary-500 text-[10px] font-black uppercase tracking-wider">Invalid</p>
                  <p className="text-2xl font-black text-secondary-900 mt-1">{result.invalid}</p>
                </div>
              </div>

              {/* Error Details */}
              {result.errors && result.errors.length > 0 && (
                <div className="bg-secondary-50/50 rounded-[28px] border border-secondary-200 overflow-hidden">
                  <div className="px-6 py-4 bg-white border-b border-secondary-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-secondary-900 uppercase tracking-widest">Error Log</h3>
                    <span className="text-[10px] font-black px-2.5 py-1 bg-secondary-900 rounded-full text-white">
                      Top {Math.min(result.errors.length, 20)}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <div key={i} className="flex items-center gap-4 text-xs bg-white px-4 py-3 rounded-2xl border border-secondary-100 shadow-sm hover:border-danger-200 transition-colors">
                        <div className="flex-shrink-0 w-12 h-7 flex items-center justify-center bg-secondary-50 rounded-lg font-black text-secondary-400 border border-secondary-100">
                          Row {err.row}
                        </div>
                        <p className="text-secondary-700 font-bold">{err.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="px-8 py-6 border-t border-secondary-100 bg-white flex-shrink-0">
          {!result ? (
            <div className="flex gap-4">
              <button
                onClick={reset}
                disabled={uploading}
                className="flex-1 px-8 py-4 text-sm font-black text-secondary-500 bg-secondary-50 rounded-2xl hover:bg-secondary-100 transition-all duration-200 border border-secondary-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 px-8 py-4 text-sm font-black text-white bg-primary-600 rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary-500/25 transition-all duration-300 transform active:scale-95"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : 'Confirm Upload'}
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={startNew}
                className="flex-1 px-8 py-4 text-sm font-black text-secondary-600 bg-secondary-50 rounded-2xl hover:bg-secondary-100 transition-all duration-200 border border-secondary-200"
              >
                New Upload
              </button>
              <button
                onClick={reset}
                className="flex-1 px-8 py-4 text-sm font-black text-white bg-secondary-900 rounded-2xl hover:bg-secondary-800 transition-all duration-300 shadow-xl shadow-secondary-900/20"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
