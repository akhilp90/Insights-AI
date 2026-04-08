import { useState, useRef } from 'react';
import { api } from '../services/api';

interface Props {
  productId: number;
  productName: string;
  onClose: () => void;
  onUploaded: () => void;
}

const UploadReviews = ({ productId, productName, onClose, onUploaded }: Props) => {
  const [file, setFile]       = useState<File | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.uploadReviews(productId, file);
      setResult(res);
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) { setFile(droppedFile); setError(''); }
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast'>
      <div className='w-[440px] bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-gray-100/80 dark:border-slate-700/50 animate-slide-up'>
        <div className='flex items-center justify-between mb-5'>
          <div>
            <h3 className='text-base font-semibold dark:text-slate-100'>Upload reviews</h3>
            <p className='text-xs text-gray-400 dark:text-slate-500 mt-0.5'>
              For <span className='font-medium text-gray-600 dark:text-slate-300'>{productName}</span>
            </p>
          </div>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-all text-lg'>&times;</button>
        </div>

        {!result ? (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-5 ${
                dragOver
                  ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20 dark:border-primary-500'
                  : file
                    ? 'border-primary-200 bg-primary-50/30 dark:border-primary-700/50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50/50 dark:hover:bg-slate-700/30'
              }`}
            >
              <input ref={inputRef} type='file' accept='.csv,.json,.xlsx,.xls' className='hidden'
                onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} />
              {file ? (
                <div>
                  <div className='w-10 h-10 mx-auto mb-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center'>
                    <svg className='w-5 h-5 text-primary-600 dark:text-primary-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                  </div>
                  <p className='text-sm font-medium text-gray-700 dark:text-slate-200'>{file.name}</p>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <div className='w-10 h-10 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center'>
                    <svg className='w-5 h-5 text-gray-400 dark:text-slate-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                    </svg>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-slate-300 font-medium'>Drop file here or click to browse</p>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>CSV, JSON, or Excel</p>
                </div>
              )}
            </div>
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-lg px-3 py-2.5 mb-4'>
                <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
              </div>
            )}
            <div className='flex gap-2.5'>
              <button onClick={onClose} className='btn-secondary flex-1 py-2.5 text-sm'>Cancel</button>
              <button onClick={handleUpload} disabled={loading || !file} className='btn-primary flex-1 py-2.5 text-sm'>
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className='bg-green-50 dark:bg-green-900/20 rounded-xl p-5 mb-5 border border-green-100/60 dark:border-green-800/30'>
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center'>
                  <svg className='w-3.5 h-3.5 text-green-600 dark:text-green-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                  </svg>
                </div>
                <p className='text-sm font-semibold text-green-700 dark:text-green-400'>Upload complete</p>
              </div>
              <div className='space-y-1.5 text-xs text-green-700 dark:text-green-400'>
                <p>Saved: <span className='font-semibold tabular-nums'>{result.saved}</span> reviews</p>
                <p>Duplicates skipped: <span className='font-semibold tabular-nums'>{result.duplicates}</span></p>
                <p>Total rows: <span className='font-semibold tabular-nums'>{result.total_rows}</span></p>
              </div>
            </div>
            <button onClick={onClose} className='btn-primary w-full py-2.5 text-sm'>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadReviews;
