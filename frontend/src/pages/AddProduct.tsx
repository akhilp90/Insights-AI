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
    <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
      <div className='w-[420px] bg-white dark:bg-slate-800 rounded-2xl p-7 shadow-xl border border-gray-100 dark:border-slate-700'>
        <div className='flex items-center justify-between mb-5'>
          <h3 className='text-base font-medium dark:text-slate-100'>Add new product</h3>
          <button onClick={onClose} className='text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-lg'>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Product name</label>
            <input type='text' value={name} onChange={e => setName(e.target.value)} placeholder='e.g. Galaxy S25' className='input-base w-full'/>
          </div>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>SKU code</label>
            <input type='text' value={sku} onChange={e => setSku(e.target.value)} placeholder='e.g. SAM-S25-2025' className='input-base w-full'/>
          </div>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className='input-base w-full'>
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          {error && <p className='text-xs text-red-500 mb-3'>{error}</p>}
          <div className='flex gap-2'>
            <button type='button' onClick={onClose} className='btn-secondary flex-1 py-2.5 text-sm'>Cancel</button>
            <button type='submit' disabled={loading} className='btn-primary flex-1 py-2.5 text-sm disabled:opacity-50'>
              {loading ? 'Creating...' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
