import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuthContext } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.username, data.password);
      toast.success('Login successful');
    } catch (error) {
      toast.error(`❌ ${error?.response?.data?.message || 'Invalid username or password'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#cffafe,_#ecfeff_50%,_#f8feff)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-cyan-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(6,182,212,0.2)] backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-2xl text-white shadow-lg shadow-cyan-500/30">
            ⚡
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your Digital Khata workspace</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input {...register('username')} className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-400" placeholder="Username" />
          <input {...register('password')} type="password" className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-400" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 font-medium text-white shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
