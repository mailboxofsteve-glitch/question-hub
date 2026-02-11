import { useState } from 'react';
import { useAdmin } from '@/hooks/use-admin';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

const Admin = () => {
  const { password, isAuthenticated, login, logout } = useAdmin();

  if (!isAuthenticated || !password) {
    return <AdminLogin onLogin={login} />;
  }

  return <AdminDashboard password={password} onLogout={logout} />;
};

export default Admin;
