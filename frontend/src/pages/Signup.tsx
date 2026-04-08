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
            Start understanding your<br />customers in minutes
          </h2>
          <p className='text-primary-100/70 text-sm leading-relaxed max-w-sm'>
            Upload reviews, get aspect-level insights. No training, no config — just answers backed by data.
          </p>
          <div className='mt-8 space-y-3'>
            {[
              'Aspect-based sentiment for every product feature',
              'Root cause signals that humans miss',
              'Ask questions, get evidence-backed answers',
            ].map((item, i) => (
              <div key={i} className='flex items-center gap-3'>
                <div className='w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0'>
                  <svg className='w-3 h-3 text-primary-200' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                  </svg>
                </div>
                <p className='text-primary-100/80 text-sm'>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className='relative z-10 text-primary-200/40 text-xs'>Free to start. No credit card required.</p>
      </div>

      {/* Right form panel */}
      <div className='flex-1 flex items-center justify-center bg-white dark:bg-slate-900 px-6'>
        <div className='w-full max-w-sm animate-fade-in'>
          <div className='mb-8 lg:hidden'><Logo /></div>
          <h2 className='text-2xl font-semibold mb-1.5 dark:text-slate-100 tracking-tight'>Create account</h2>
          <p className='text-sm text-gray-500 dark:text-slate-400 mb-6'>Get started with Insights</p>

          <div className='tab-bar mb-6'>
            <button onClick={() => setMode('join')}
              className={'tab-item flex-1 ' + (mode === 'join' ? 'tab-active' : 'tab-inactive')}>
              Join company
            </button>
            <button onClick={() => setMode('create')}
              className={'tab-item flex-1 ' + (mode === 'create' ? 'tab-active' : 'tab-inactive')}>
              New company
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'join' ? (
              <div className='mb-4'>
                <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Company code</label>
                <input type='text' value={clientSlug} onChange={e => setClientSlug(e.target.value)} placeholder='e.g. samsung' className='input-base w-full' />
              </div>
            ) : (
              <div className='mb-4'>
                <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Company name</label>
                <input type='text' value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder='e.g. Acme Corp' className='input-base w-full' />
              </div>
            )}
            <div className='mb-4'>
              <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Email</label>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@company.com' className='input-base w-full' />
            </div>
            <div className='mb-4'>
              <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Password</label>
              <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Min. 6 characters' className='input-base w-full' />
            </div>
            <div className='mb-5'>
              <label className='block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2'>Confirm password</label>
              <input type='password' value={confirmPassword} onChange={e => setConfirmPass(e.target.value)} placeholder='Re-enter password' className='input-base w-full' />
            </div>
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-lg px-3 py-2.5 mb-4'>
                <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
              </div>
            )}
            <button type='submit' disabled={loading} className='btn-primary w-full py-3 text-sm'>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <div className='mt-6 pt-6 border-t border-gray-100 dark:border-slate-800'>
            <p className='text-sm text-gray-400 dark:text-slate-500 text-center'>
              Already have an account?{' '}
              <Link to='/login' className='text-primary-600 dark:text-primary-400 font-medium hover:underline'>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
