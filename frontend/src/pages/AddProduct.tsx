import { useState } from 'react';
import { api } from '../services/api';

const categories = ['mobile', 'tablet', 'laptop', 'wearable', 'tv', 'other'];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const AddProduct = ({ onClose, onCreated }: Props) => {
  const [name, setName]         = useState('');
  const [sku, setSku]           = useState('');
  const [category, setCategory] = useState('mobile');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Product name is required'); return; }
    if (!sku.trim()) { setError('SKU code is required'); return; }
    setLoading(true);
    try {
      await api.createProduct(name, sku, category);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast'>
      <div className='w-[440px] bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-gray-100/80 dark:border-slate-700/50 animate-slide-up'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h3 className='text-base font-semibold dark:text-slate-100'>Add new product</h3>
            <p className='text-xs text-gray-400 dark:text-slate-500 mt-0.5'>Create a product to start tracking reviews</p>
          </div>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-all text-lg'>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Product name</label>
            <input type='text' value={name} onChange={e => setName(e.target.value)} placeholder='e.g. Galaxy S25' className='input-base w-full' />
          </div>
          <div className='mb-4'>
            <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>SKU code</label>
            <input type='text' value={sku} onChange={e => setSku(e.target.value)} placeholder='e.g. SAM-S25-2025' className='input-base w-full' />
          </div>
          <div className='mb-5'>
            <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className='input-base w-full'>
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          {error && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-lg px-3 py-2.5 mb-4'>
              <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
            </div>
          )}
          <div className='flex gap-2.5'>
            <button type='button' onClick={onClose} className='btn-secondary flex-1 py-2.5 text-sm'>Cancel</button>
            <button type='submit' disabled={loading} className='btn-primary flex-1 py-2.5 text-sm'>
              {loading ? 'Creating...' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
