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

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [profile]);

  const login = async ({ npm, password }) => {
    const { data, error } = await supabase.rpc('login_app_user', {
      p_npm: String(npm).trim(),
      p_password: password
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data?.[0];

    if (!user) {
      throw new Error('NPM atau password tidak sesuai.');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setProfile(user);
    setShowWelcome(true);
  };

  const register = async ({
    full_name,
    nickname,
    npm,
    password,
    birth_date
  }) => {
    const { data, error } = await supabase.rpc('register_app_user', {
      p_full_name: full_name,
      p_nickname: nickname,
      p_npm: String(npm).trim(),
      p_password: password,
      p_birth_date: birth_date || null
    });

    if (error) {
      throw new Error(error.message);
    }

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
      .select(
        'id, full_name, nickname, npm, birth_date, role, theme_preference, font_size_preference'
      )
      .eq('id', profile.id)
      .single();

    if (error) {
      throw error;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  };

  const value = useMemo(
    () => ({
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
    }),
    [profile, loading, showWelcome]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
