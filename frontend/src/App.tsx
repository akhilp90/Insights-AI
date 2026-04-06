import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing       from './pages/Landing';
import Login         from './pages/Login';
import Signup        from './pages/Signup';
import Dashboard     from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import DeepDive      from './pages/DeepDive';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to='/login' />;
};

const App = () => (
  <ThemeProvider>
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path='/'                     element={<Landing />} />
        <Route path='/login'                element={<Login />} />
        <Route path='/signup'               element={<Signup />} />
        <Route path='/dashboard'            element={<Protected><Dashboard /></Protected>} />
        <Route path='/product/:id'          element={<Protected><ProductDetail /></Protected>} />
        <Route path='/product/:id/deepdive' element={<Protected><DeepDive /></Protected>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  </ThemeProvider>
);

export default App;
