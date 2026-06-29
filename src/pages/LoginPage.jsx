import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { parseDDMMYY } from '../utils/date.js';

export default function LoginPage() {
  const { login, register } = useAuth();

  const [npm, setNpm] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [regOpen, setRegOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reg, setReg] = useState({
    full_name: '',
    nickname: '',
    npm: '',
    password: '',
    confirm: '',
    birth: ''
  });
  const [loading, setLoading] = useState(false);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ npm, password });
    } catch {
      setError('NPM atau password tidak sesuai.');
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');

    const birth_date = parseDDMMYY(reg.birth);

    if (!birth_date) {
      setError('Format tanggal lahir harus dd/mm/yyyy. Contoh: 20/11/2003.');
      return;
    }

    if (reg.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    if (reg.password !== reg.confirm) {
      setError('Password dan konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: reg.full_name.trim(),
        nickname: reg.nickname.trim(),
        npm: reg.npm.trim(),
        password: reg.password,
        birth_date
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registrasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const closeReg = () => {
    setRegOpen(false);
    setSuccess(false);
    setError('');
    setReg({
      full_name: '',
      nickname: '',
      npm: '',
      password: '',
      confirm: '',
      birth: ''
    });
  };

  return (
    <div className="app-bg grid min-h-screen place-items-center p-4">
      <form onSubmit={submitLogin} className="card w-full max-w-md p-8">
        <button
          type="button"
          onDoubleClick={() => setRegOpen(true)}
          onContextMenu={(e) => e.preventDefault()}
          className="mx-auto mb-6 block h-28 w-44 cursor-default select-none border-0 bg-transparent bg-contain bg-center bg-no-repeat p-0 shadow-none outline-none md:h-32 md:w-52"
          style={{ backgroundImage: "url('/assets/logo.png')" }}
          aria-label="Logo RPL Kripto"
        />

        <h1 className="mb-8 text-center text-lg font-black tracking-wide text-slate-900 dark:text-white">
          REKAYASA PERANGKAT LUNAK KRIPTO
        </h1>

        <div className="space-y-4">
          <label className="block">
            <span className="label">NPM</span>
            <input
              value={npm}
              onChange={(e) => setNpm(e.target.value)}
              className="input mt-1"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              autoComplete="current-password"
            />
          </label>

          {error && !regOpen && (
            <p className="text-sm font-semibold text-red-600 dark:text-red-300">
              {error}
            </p>
          )}

          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </div>
      </form>

      <Modal open={regOpen} onClose={closeReg} title={success ? '' : 'Registrasi Akun'}>
        {success ? (
          <div className="py-8 text-center">
            <p className="text-lg font-black text-slate-900 dark:text-white">
              Pendaftaran/Registrasi Berhasil
            </p>

            <button onClick={closeReg} className="btn-primary mt-6">
              Kembali
            </button>
          </div>
        ) : (
          <form onSubmit={submitRegister} className="space-y-4">
            <label className="block">
              <span className="label">Nama Lengkap</span>
              <input
                required
                className="input mt-1"
                value={reg.full_name}
                onChange={(e) => setReg({ ...reg, full_name: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="label">Nama Panggilan</span>
              <input
                required
                className="input mt-1"
                value={reg.nickname}
                onChange={(e) => setReg({ ...reg, nickname: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="label">NPM</span>
              <input
                required
                className="input mt-1"
                value={reg.npm}
                onChange={(e) => setReg({ ...reg, npm: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="label">Password</span>
              <input
                required
                type="password"
                className="input mt-1"
                value={reg.password}
                onChange={(e) => setReg({ ...reg, password: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="label">Konfirmasi Password</span>
              <input
                required
                type="password"
                className="input mt-1"
                value={reg.confirm}
                onChange={(e) => setReg({ ...reg, confirm: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="label">Tanggal Lahir</span>
              <input
                required
                placeholder="dd/mm/yyyy"
                className="input mt-1"
                value={reg.birth}
                onChange={(e) => setReg({ ...reg, birth: e.target.value })}
              />

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Contoh: 20/11/2003
              </p>
            </label>

            {error && (
              <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                {error}
              </p>
            )}

            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Memproses...' : 'Registrasi'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
