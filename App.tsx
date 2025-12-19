
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import UnitManagement from './components/UnitManagement';
import { User } from './types';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<'vagas' | 'usuarios' | 'unidades'>('vagas');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, full_name, role, UNIDADES')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          const userData: User = {
            id: profileData.id,
            username: profileData.username,
            full_name: profileData.full_name,
            role: profileData.role,
            unidades: Array.isArray(profileData.UNIDADES) ? profileData.UNIDADES : []
          };
          setUser(userData);
          localStorage.setItem('reiterlog_profile', JSON.stringify(userData));
        } else {
          handleLogout();
        }
      } else {
        const savedUser = localStorage.getItem('reiterlog_profile');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            handleLogout();
          }
        }
      }
      setInitializing(false);
    };

    checkSession();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('reiterlog_profile', JSON.stringify(userData));
    setCurrentView('vagas');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('vagas');
    localStorage.removeItem('reiterlog_profile');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31e24]"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'usuarios':
        return <UserManagement user={user} onBack={() => setCurrentView('vagas')} />;
      case 'unidades':
        return <UnitManagement user={user} onBack={() => setCurrentView('vagas')} />;
      default:
        return (
          <Dashboard 
            user={user} 
            onLogout={handleLogout} 
            onNavigateToUsers={() => setCurrentView('usuarios')} 
            onNavigateToUnits={() => setCurrentView('unidades')}
          />
        );
    }
  };

  return (
    <>
      {renderView()}
    </>
  );
};

export default App;
