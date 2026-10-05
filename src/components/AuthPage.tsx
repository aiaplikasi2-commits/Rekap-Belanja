import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, FileSpreadsheet, LogIn, UserPlus, KeyRound, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        if (!email || !password) {
          throw new Error('Silakan isi email dan password.');
        }
        if (password.length < 6) {
          throw new Error('Password minimal 6 karakter.');
        }
        await registerWithEmail(email, password, displayName);
      } else if (mode === 'reset') {
        if (!email) {
          throw new Error('Silakan masukkan email Anda.');
        }
        await resetPassword(email);
        setSuccess('Link reset password telah dikirim ke email Anda.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errCode = err.code || '';
      const errMsg = err.message || '';

      if (errCode === 'auth/operation-not-allowed' || errMsg.includes('operation-not-allowed')) {
        setError(
          'Metode pendaftaran Email & Password belum diaktifkan di Firebase Console. Silakan gunakan tombol "Masuk dengan Google" di bawah untuk login instan!'
        );
      } else if (errCode === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar. Silakan pilih menu "Kembali ke Login".');
      } else if (errCode === 'auth/weak-password') {
        setError('Password terlalu lemah/pendek. Minimal 6 karakter.');
      } else if (errCode === 'auth/invalid-email') {
        setError('Format alamat email tidak valid.');
      } else if (
        errCode === 'auth/user-not-found' ||
        errCode === 'auth/wrong-password' ||
        errCode === 'auth/invalid-credential'
      ) {
        setError('Email atau password yang Anda masukkan tidak sesuai.');
      } else {
        setError(errMsg || 'Terjadi kesalahan saat pendaftaran/login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 text-slate-100 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-3 border border-blue-500/30">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">REKAP BELANJA ONLINE</h1>
          <p className="text-xs text-slate-400 mt-1">Sistem Rekap Belanja Full Online</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama Pengguna"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-semibold rounded-xl text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-5 h-5" />
                <span>Masuk Ke Aplikasi</span>
              </>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Daftar Akun Baru</span>
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                <span>Kirim Reset Password</span>
              </>
            )}
          </button>
        </form>

        <div className="my-6 relative flex items-center justify-center">
          <div className="border-t border-slate-700 w-full" />
          <span className="bg-slate-800 px-3 text-xs text-slate-400 uppercase tracking-wider absolute">
            atau
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 text-sm font-medium flex items-center justify-center gap-3 transition border border-slate-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-.6-1.5-1.5-2-2.5z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>Masuk dengan Google</span>
        </button>

        <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>
              <p>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-blue-400 hover:underline font-semibold"
                >
                  Daftar Sekarang
                </button>
              </p>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-slate-400 hover:text-slate-200 underline"
              >
                Lupa Password?
              </button>
            </>
          ) : (
            <p>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-400 hover:underline font-semibold"
              >
                Kembali ke Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
