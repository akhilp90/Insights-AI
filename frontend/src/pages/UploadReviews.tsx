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

  return (
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='w-[420px] bg-white dark:bg-slate-800 rounded-2xl p-7 shadow-xl border border-gray-100 dark:border-slate-700'>
        <div className='flex items-center justify-between mb-5'>
          <h3 className='text-base font-medium dark:text-slate-100'>Upload reviews</h3>
          <button onClick={onClose} className='text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-lg'>&times;</button>
        </div>
        <p className='text-xs text-gray-500 dark:text-slate-400 mb-4'>
          Upload reviews for <span className='font-medium text-gray-700 dark:text-slate-200'>{productName}</span>
        </p>

        {!result ? (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              className='border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors mb-4'
            >
              <input ref={inputRef} type='file' accept='.csv,.json,.xlsx,.xls' className='hidden'
                onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} />
              {file ? (
                <div>
                  <p className='text-sm font-medium text-gray-700 dark:text-slate-200'>{file.name}</p>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className='text-sm text-gray-500 dark:text-slate-400'>Click to select file</p>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>CSV, JSON, or Excel</p>
                </div>
              )}
            </div>
            {error && <p className='text-xs text-red-500 mb-3'>{error}</p>}
            <div className='flex gap-2'>
              <button onClick={onClose} className='btn-secondary flex-1 py-2.5 text-sm'>Cancel</button>
              <button onClick={handleUpload} disabled={loading || !file} className='btn-primary flex-1 py-2.5 text-sm disabled:opacity-50'>
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className='bg-green-50 dark:bg-green-900/30 rounded-xl p-4 mb-4'>
              <p className='text-sm font-medium text-green-800 dark:text-green-400 mb-2'>Upload complete</p>
              <div className='space-y-1 text-xs text-green-700 dark:text-green-500'>
                <p>Saved: {result.saved} reviews</p>
                <p>Duplicates skipped: {result.duplicates}</p>
                <p>Total rows: {result.total_rows}</p>
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
