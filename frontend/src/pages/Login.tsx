import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center'>
      <div className='w-96 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-8'>
        <div className='mb-7'><Logo /></div>
        <h2 className='text-xl font-medium mb-1 dark:text-slate-100'>Welcome back</h2>
        <p className='text-sm text-gray-500 dark:text-slate-400 mb-6'>Sign in to your product manager account</p>
        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='pm@company.com' className='input-base w-full'/>
          </div>
          <div className='mb-4'>
            <label className='block text-xs text-gray-500 dark:text-slate-400 mb-1.5'>Password</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='........' className='input-base w-full'/>
          </div>
          {error && <p className='text-xs text-red-500 mb-3'>{error}</p>}
          <button type='submit' disabled={loading} className='btn-primary w-full py-2.5 text-sm mt-1 disabled:opacity-50'>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>
        <p className='text-xs text-gray-400 dark:text-slate-500 text-center mt-5'>
          Don't have an account? <Link to='/signup' className='text-primary-600 dark:text-primary-400 hover:underline'>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
