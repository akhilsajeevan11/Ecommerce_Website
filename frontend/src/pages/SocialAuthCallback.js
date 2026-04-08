import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';

const SocialAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socialLogin } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Social login failed. Please try again.');
      navigate('/');
      return;
    }

    if (token) {
      socialLogin(token);
      toast.success('Welcome!');
      navigate('/');
    } else {
      navigate('/');
    }
  }, [searchParams, navigate, socialLogin]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Manrope', sans-serif", color: '#71717a' }}>Signing you in...</p>
    </div>
  );
};

export default SocialAuthCallback;
