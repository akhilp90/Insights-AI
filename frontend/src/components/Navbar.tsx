import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SunIcon = () => (
  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
      d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z' />
  </svg>
);

const MoonIcon = () => (
  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5}
      d='M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' />
  </svg>
);

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className='bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-8 py-3.5 flex items-center justify-between'>
      <div className='cursor-pointer' onClick={() => navigate('/')}>
        <Logo />
      </div>
      <div className='flex items-center gap-3'>
        {isAuthenticated ? (
          <>
            <span className='text-sm text-gray-500 dark:text-slate-400'>{user?.email}</span>
            <button className='btn-secondary' onClick={() => { logout(); navigate('/'); }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className='btn-secondary' onClick={() => navigate('/login')}>Log in</button>
            <button className='btn-primary' onClick={() => navigate('/signup')}>Get started</button>
          </>
        )}
        <button
          onClick={toggle}
          className='w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
