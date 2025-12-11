import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, ClipboardList, Truck, Menu, FileText, Settings as SettingsIcon } from 'lucide-react';
import { seedDatabase } from './services/db';

import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import DRE from './pages/DRE';
import Settings from './pages/Settings';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <Store size={22} />, label: 'PDV' },
    { to: '/inventory', icon: <ClipboardList size={22} />, label: 'Estoque' },
    { to: '/suppliers', icon: <Truck size={22} />, label: 'Parceiros' },
    { to: '/dashboard', icon: <LayoutDashboard size={22} />, label: 'Relatórios' },
    { to: '/dre', icon: <FileText size={22} />, label: 'DRE Anual' },
    { to: '/settings', icon: <SettingsIcon size={22} />, label: 'Configurações' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Premium Navigation Rail (Desktop) */}
      <aside className="hidden md:flex flex-col w-[80px] lg:w-[260px] bg-white border-r border-slate-200/60 fixed h-full z-30 transition-all duration-300 shadow-sm backdrop-blur-xl bg-opacity-80">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6">
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-indigo-500/20">
              M
            </div>
            <span className="hidden lg:block font-display font-bold text-xl text-slate-900 tracking-tight">MixMaster</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                  ${isActive
                    ? 'bg-indigo-50/80 text-indigo-700 shadow-sm font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-full opacity-0 lg:opacity-100 transition-opacity" />
                )}
                <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                <span className="hidden lg:block text-[0.925rem] relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 hidden lg:block mt-auto">
          <div className="glass-card rounded-2xl p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">System Status</p>
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Online • v1.2.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[80px] lg:ml-[260px] min-h-screen transition-all duration-300">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 h-[72px] flex justify-around items-center px-1 z-50 pb-safe">
        {navItems.slice(0, 5).map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center w-full h-full gap-1 pt-1 active:scale-95 transition-transform"
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-50 text-indigo-600 -translate-y-1' : 'text-slate-400'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
              </div>
              <span className={`text-[10px] font-medium leading-none transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/settings"
          className="flex flex-col items-center justify-center w-full h-full gap-1 pt-1 md:hidden active:scale-95 transition-transform"
        >
          <div className={`p-1.5 rounded-full transition-all duration-300 ${location.pathname === '/settings' ? 'bg-indigo-50 text-indigo-600 -translate-y-1' : 'text-slate-400'}`}>
            <SettingsIcon size={20} />
          </div>
          <span className={`text-[10px] font-medium leading-none transition-colors ${location.pathname === '/settings' ? 'text-indigo-600' : 'text-slate-400'}`}>Config</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default function App() {
  // useEffect(() => {
  //   seedDatabase();
  // }, []);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dre" element={<DRE />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
