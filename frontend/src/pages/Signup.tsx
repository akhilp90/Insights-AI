import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [mode, setMode]                   = useState<'join' | 'create'>('join');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPass] = useState('');
  const [clientSlug, setClientSlug]       = useState('');
  const [companyName, setCompanyName]     = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const { signup, signupNewCompany }      = useAuth();
  const navigate                          = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (mode === 'join' && !clientSlug.trim()) { setError('Company code is required'); return; }
    if (mode === 'create' && !companyName.trim()) { setError('Company name is required'); return; }
    setLoading(true);
    try {
      if (mode === 'join') {
        await signup(email, password, clientSlug);
      } else {
        await signupNewCompany(companyName, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center'>
      <div className='w-96 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-8'>
        <div className='mb-7'><Logo /></div>
        <h2 className='text-xl font-medium mb-1 dark:text-slate-100'>Create account</h2>
        <p className='text-sm text-gray-500 dark:text-slate-400 mb-5'>Get started with Insights</p>

        <div className='flex gap-1 mb-5 bg-gray-50 dark:bg-slate-700 rounded-lg p-1'>
          <button onClick={() => setMode('join')}
            className={'flex-1 text-xs py-2 rounded-md transition-colors ' + (mode === 'join' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 font-medium shadow-sm' : 'text-gray-500 dark:text-slate-400')}>
            Join existing company
          </button>
          <button onClick={() => setMode('create')}
            className={'flex-1 text-xs py-2 rounded-md transition-colors ' + (mode === 'create' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 font-medium shadow-sm' : 'text-gray-500 dark:text-slate-400')}>
            Create new company
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'join' ? (
            <div className='mb-4'>
              <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Company code</label>
              <input type='text' value={clientSlug} onChange={e => setClientSlug(e.target.value)} placeholder='e.g. samsung' className='input-base w-full'/>
            </div>
          ) : (
            <div className='mb-4'>
              <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Company name</label>
              <input type='text' value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder='e.g. Acme Corp' className='input-base w-full'/>
            </div>
          )}
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@company.com' className='input-base w-full'/>
          </div>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Password</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='........' className='input-base w-full'/>
          </div>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Confirm password</label>
            <input type='password' value={confirmPassword} onChange={e => setConfirmPass(e.target.value)} placeholder='........' className='input-base w-full'/>
          </div>
          {error && <p className='text-xs text-red-500 mb-3'>{error}</p>}
          <button type='submit' disabled={loading} className='btn-primary w-full py-2.5 text-sm mt-1 disabled:opacity-50'>
            {loading ? 'Creating account...' : 'Create account →'}
          </button>
        </form>
        <p className='text-xs text-gray-400 dark:text-slate-500 text-center mt-5'>
          Already have an account? <Link to='/login' className='text-primary-600 dark:text-primary-400 hover:underline'>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
