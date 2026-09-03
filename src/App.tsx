import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Profile, Department, UserRole, ROLE_LABELS } from './types';
import AuthPage from './pages/auth/AuthPage';
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard';
import CEODashboard from './pages/dashboard/CEODashboard';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import SeniorViewerDashboard from './pages/dashboard/SeniorViewerDashboard';
import ITAdminDashboard from './pages/dashboard/ITAdminDashboard';
import SettingsPage from './pages/settings/SettingsPage';
import {
  LogOut, Settings, LayoutDashboard, User, ChevronDown, Menu, X,
  ShieldCheck, Users, BarChart3, Briefcase, Building2, UserCog, BellRing, MessageCircle,
} from 'lucide-react';
import AIChat from './components/AIChat';
import { registerServiceWorker, requestNotificationPermission, subscribeToPush } from './lib/push';

type AppPage = 'dashboard' | 'settings';

function getRoleIcon(role: UserRole) {
  const map: Record<UserRole, React.ReactNode> = {
    ceo: <ShieldCheck size={16} className="text-yellow-500" />,
    it_admin: <UserCog size={16} className="text-red-500" />,
    manager: <Briefcase size={16} className="text-blue-500" />,
    hr: <Users size={16} className="text-purple-500" />,
    ceo_office_head: <Building2 size={16} className="text-orange-500" />,
    strategic_advisor: <BarChart3 size={16} className="text-teal-500" />,
    employee: <User size={16} className="text-green-600" />,
  };
  return map[role] ?? <User size={16} />;
}

function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role] ?? role;
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState<AppPage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id);
      else setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setAuthChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile);
    setAuthChecked(true);

    const { data: depts } = await supabase.from('departments').select('*').order('name');
    setDepartments(depts ?? []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPage('dashboard');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <AuthPage onAuthenticated={() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) loadProfile(session.user.id);
        });
      }} />
    );
  }

  const renderDashboard = () => {
    if (page === 'settings') {
      return (
        <SettingsPage
          profile={profile}
          departments={departments}
          onProfileUpdated={(updated) => setProfile(updated)}
        />
      );
    }

    const role = profile.role;
    if (role === 'ceo') return <CEODashboard profile={profile} />;
    if (role === 'it_admin') return <ITAdminDashboard profile={profile} />;
    if (role === 'manager') return <ManagerDashboard profile={profile} />;
    if (role === 'hr' || role === 'ceo_office_head' || role === 'strategic_advisor') return <SeniorViewerDashboard profile={profile} />;
    return <EmployeeDashboard profile={profile} />;
  };

  const DashboardTitle = () => {
    if (page === 'settings') return <span className="text-gray-800 font-bold">Settings</span>;
    const labels: Record<UserRole, string> = {
      ceo: 'CEO Dashboard',
      it_admin: 'IT Admin Panel',
      manager: 'Manager Dashboard',
      hr: 'HR Dashboard',
      ceo_office_head: 'CEO Office Dashboard',
      strategic_advisor: 'Strategic Advisor Dashboard',
      employee: 'My Dashboard',
    };
    return <span className="text-gray-800 font-bold">{labels[profile.role] ?? 'Dashboard'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img src="/logo.png" alt="AHG" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-green-800 leading-tight">AFRICAN HOLDING GROUPS</p>
              <p className="text-xs text-gray-500 leading-tight">Weekly Planning System</p>
            </div>
          </div>

          {/* Page title */}
          <div className="flex-1 flex items-center justify-center">
            <DashboardTitle />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setPage('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === 'dashboard' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button
                onClick={() => setPage('settings')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  page === 'settings' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings size={15} /> Settings
              </button>
              <button onClick={async () => {
                // Request permission and optionally register SW
                const perm = await requestNotificationPermission();
                if (perm === 'granted') {
                  const reg = await registerServiceWorker();
                  try {
                    const vapid = import.meta.env.VITE_VAPID_PUBLIC || '';
                    if (reg && vapid) {
                      const sub = await subscribeToPush(reg, vapid);
                      // Normally send `sub` to your server to save
                      console.info('Push subscription', sub);
                      alert('Subscribed to push notifications (client only).');
                    } else {
                      alert('Push enabled (no VAPID configured).');
                    }
                  } catch (e) { console.error(e); alert('Push subscription failed'); }
                } else {
                  alert('Notifications permission not granted');
                }
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100">
                <BellRing size={15} /> Notify
              </button>
              <button onClick={() => setChatOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100">
                <MessageCircle size={15} /> AI
              </button>
            </div>

            {/* Profile chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="max-w-32">
                <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{profile.full_name}</p>
                <div className="flex items-center gap-1">
                  {getRoleIcon(profile.role)}
                  <p className="text-xs text-gray-500 leading-tight truncate">{getRoleLabel(profile.role)}</p>
                </div>
              </div>
            </div>

            <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Mobile menu btn */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{profile.full_name}</p>
                <p className="text-xs text-gray-500">{getRoleLabel(profile.role)}</p>
              </div>
            </div>
            <button
              onClick={() => { setPage('dashboard'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              onClick={() => { setPage('settings'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings size={16} /> Settings
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderDashboard()}
        <AIChat open={chatOpen} onClose={() => setChatOpen(false)} />
      </main>
    </div>
  );
}
