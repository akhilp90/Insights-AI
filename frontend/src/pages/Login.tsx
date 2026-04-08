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
    <div className='min-h-screen flex'>
      {/* Left decorative panel */}
      <div className='hidden lg:flex lg:w-[480px] xl:w-[560px] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden flex-col justify-between p-12'>
        <div className='absolute inset-0 opacity-[0.07]' style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl' />
        <div className='absolute -top-20 -left-20 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl' />

        <div className='relative z-10'>
          <div className='mb-2'>
            <svg width='36' height='36' viewBox='0 0 28 28' fill='none'>
              <rect width='28' height='28' rx='8' fill='rgba(255,255,255,0.15)' />
              <polyline points='5,20 10,13 15,16 22,7' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              <circle cx='22' cy='7' r='2' fill='#93c5fd' />
            </svg>
          </div>
          <p className='text-white/60 text-sm font-medium'>Insights</p>
        </div>

        <div className='relative z-10 animate-fade-in'>
          <h2 className='text-3xl font-semibold text-white leading-snug mb-4'>
            Turn customer reviews into<br />actionable intelligence
          </h2>
          <p className='text-primary-100/70 text-sm leading-relaxed max-w-sm'>
            Aspect-level sentiment analysis, root cause detection, and AI-powered insights — all from your review data.
          </p>
          <div className='mt-8 flex items-center gap-4'>
            {[
              { value: '10K+', label: 'Reviews analyzed' },
              { value: '94%', label: 'Accuracy' },
              { value: '<2m', label: 'Time to insight' },
            ].map((s, i) => (
              <div key={i} className='text-center'>
                <p className='text-white text-xl font-semibold tabular-nums'>{s.value}</p>
                <p className='text-primary-200/60 text-[10px] uppercase tracking-wider mt-0.5'>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className='relative z-10 text-primary-200/40 text-xs'>AI-powered product feedback analysis</p>
      </div>

      {/* Right form panel */}
      <div className='flex-1 flex items-center justify-center bg-white dark:bg-slate-900 px-6'>
        <div className='w-full max-w-sm animate-fade-in'>
          <div className='mb-8 lg:hidden'><Logo /></div>
          <h2 className='text-2xl font-semibold mb-1.5 dark:text-slate-100 tracking-tight'>Welcome back</h2>
          <p className='text-sm text-gray-500 dark:text-slate-400 mb-8'>Sign in to your account to continue</p>
          <form onSubmit={handleSubmit}>
            <div className='mb-5'>
              <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Email</label>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='pm@company.com' className='input-base w-full' />
            </div>
            <div className='mb-5'>
              <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Password</label>
              <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Enter your password' className='input-base w-full' />
            </div>
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-lg px-3 py-2.5 mb-4'>
                <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
              </div>
            )}
            <button type='submit' disabled={loading} className='btn-primary w-full py-3 text-sm mt-1'>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className='mt-6 pt-6 border-t border-gray-100 dark:border-slate-800'>
            <p className='text-sm text-gray-400 dark:text-slate-500 text-center'>
              Don't have an account?{' '}
              <Link to='/signup' className='text-primary-600 dark:text-primary-400 font-medium hover:underline'>Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
