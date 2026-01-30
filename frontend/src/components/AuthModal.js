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
      <DialogContent className="sm:max-w-[480px] p-12 border-none rounded-none bg-white">
        <DialogHeader className="space-y-4 mb-8">
          <DialogTitle className="font-heading text-4xl text-center font-medium">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8">
          {mode === 'register' && (
            <div className="space-y-1">
              <Label htmlFor="name" className="font-mono text-[10px] tracking-[0.2em] uppercase text-black">Name</Label>
              <Input
                id="name"
                data-testid="auth-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-none border-b border-t-0 border-x-0 border-gray-200 focus-visible:ring-0 focus-visible:border-black p-0 h-10 transition-colors bg-transparent"
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email" className="font-mono text-[10px] tracking-[0.2em] uppercase text-black">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="auth-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-none border-b border-t-0 border-x-0 border-gray-200 focus-visible:ring-0 focus-visible:border-black p-0 h-10 transition-colors bg-transparent"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="font-mono text-[10px] tracking-[0.2em] uppercase text-black">Password</Label>
            <Input
              id="password"
              type="password"
              data-testid="auth-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-none border-b border-t-0 border-x-0 border-gray-200 focus-visible:ring-0 focus-visible:border-black p-0 h-10 transition-colors bg-transparent"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 rounded-none bg-black text-white hover:bg-zinc-800 font-mono text-xs tracking-[0.1em] transition-all"
            disabled={loading}
            data-testid="auth-submit-btn"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
          <div className="text-center pt-2">
            <button
              type="button"
              className="font-mono text-[10px] tracking-widest text-black/60 hover:text-black transition-colors"
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
