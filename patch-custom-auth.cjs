const fs = require("fs");
const path = require("path");

const root = process.cwd();

function write(file, content) {
  const full = path.join(root, file);
  fs.writeFileSync(full, content.trimStart(), "utf8");
  console.log("UPDATED:", file);
}

function replaceInFile(file, replacements) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;

  let content = fs.readFileSync(full, "utf8");

  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }

  fs.writeFileSync(full, content, "utf8");
  console.log("PATCHED:", file);
}

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// 1. Ganti src/lib/supabase.js
write("src/lib/supabase.js", `
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env belum diset. Salin .env.example menjadi .env lalu isi kredensial Supabase.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
`);

// 2. Ganti src/context/AuthContext.jsx
write("src/context/AuthContext.jsx", `
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'classhub_user';

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setProfile(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile) return undefined;

    let timeoutId;

    const logoutByTimeout = () => {
      localStorage.removeItem(STORAGE_KEY);
      setShowWelcome(false);
      setProfile(null);
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutByTimeout, IDLE_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [profile]);

  const login = async ({ npm, password }) => {
    const { data, error } = await supabase.rpc('login_app_user', {
      p_npm: String(npm).trim(),
      p_password: password
    });

    if (error) throw new Error(error.message);

    const user = data?.[0];
    if (!user) throw new Error('NPM atau password tidak sesuai.');

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setProfile(user);
    setShowWelcome(true);
  };

  const register = async ({ full_name, nickname, npm, password, birth_date }) => {
    const { data, error } = await supabase.rpc('register_app_user', {
      p_full_name: full_name,
      p_nickname: nickname,
      p_npm: String(npm).trim(),
      p_password: password,
      p_birth_date: birth_date || null
    });

    if (error) throw new Error(error.message);

    return data?.[0];
  };

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowWelcome(false);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, nickname, npm, birth_date, role, theme_preference, font_size_preference')
      .eq('id', profile.id)
      .single();

    if (error) throw error;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  };

  const value = useMemo(() => ({
    session: profile ? { user: profile } : null,
    profile,
    loading,
    showWelcome,
    setShowWelcome,
    login,
    register,
    logout,
    refreshProfile,
    isAdmin: profile?.role === 'admin'
  }), [profile, loading, showWelcome]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
`);

// 3. Patch otomatis semua file .jsx
walk(path.join(root, "src"), (full) => {
  if (!full.endsWith(".jsx")) return;

  let content = fs.readFileSync(full, "utf8");

  // Pastikan React import ada
  if (!/import\s+React\b/.test(content)) {
    if (/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/.test(content)) {
      content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/,
        "import React, {$1} from 'react';"
      );
    } else {
      content = "import React from 'react';\\n" + content;
    }
  }

  // Hilangkan emailFromNpm jika ada
  content = content.replaceAll("import { supabase, emailFromNpm } from '../lib/supabase';", "import { supabase } from '../lib/supabase';");
  content = content.replaceAll("import { supabase, emailFromNpm } from '../lib/supabase.js';", "import { supabase } from '../lib/supabase.js';");

  // Supaya kompatibel dengan kode lama
  content = content.replaceAll("profile?.user_id", "profile?.id");
  content = content.replaceAll("profile.user_id", "profile.id");

  fs.writeFileSync(full, content, "utf8");
});

console.log("DONE: patch React import + custom auth core.");

console.log("Patch file created successfully.");