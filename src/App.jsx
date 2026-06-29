import React from "react";
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardShell from './pages/DashboardShell.jsx';

function AppContent() {
  const { session, loading } = useAuth();
  if (loading) return <div className="app-bg grid min-h-screen place-items-center text-sm">Memuat ClassHub...</div>;
  return session ? <DashboardShell /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
