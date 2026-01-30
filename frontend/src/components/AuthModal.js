import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AppContext';
import { toast } from 'sonner';

const AuthModal = ({ open, onClose, mode, onModeChange }) => {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await register(email, password, name);
        toast.success('Account created successfully!');
      }
      onClose();
      setEmail('');
      setPassword('');
      setName('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-font text-3xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="mono-font text-xs tracking-wider uppercase">Name</Label>
              <Input
                id="name"
                data-testid="auth-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-none border-b border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-black"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="mono-font text-xs tracking-wider uppercase">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="auth-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-none border-b border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-black"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="mono-font text-xs tracking-wider uppercase">Password</Label>
            <Input
              id="password"
              type="password"
              data-testid="auth-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-none border-b border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-black"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-none bg-black text-white hover:bg-zinc-800 btn-noir"
            disabled={loading}
            data-testid="auth-submit-btn"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
          <div className="text-center">
            <button
              type="button"
              className="mono-font text-xs tracking-wider hover:opacity-70 transition-opacity"
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
              data-testid="auth-toggle-btn"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
