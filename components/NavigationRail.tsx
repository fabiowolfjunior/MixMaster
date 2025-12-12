import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Store, ClipboardList, Truck, LayoutDashboard, FileText, Settings as SettingsIcon, Menu } from 'lucide-react';

const navItems = [
    { to: '/', icon: <Store size={24} />, label: 'PDV' },
    { to: '/inventory', icon: <ClipboardList size={24} />, label: 'Estoque' },
    { to: '/delivery', icon: <Truck size={24} />, label: 'Logística' },
    { to: '/suppliers', icon: <Menu size={24} />, label: 'Parceiros' },
    { to: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Relatórios' },
    { to: '/dre', icon: <FileText size={24} />, label: 'DRE' },
    { to: '/settings', icon: <SettingsIcon size={24} />, label: 'Config' },
];

export default function NavigationRail() {
    const location = useLocation();

    return (
        <aside className="m3-nav-rail flex fixed left-0 top-0 bottom-0 z-30 transition-all duration-300">
            {/* Menu / Logo Icon */}
            <div className="h-14 w-full flex items-center justify-center mb-4">
                <button className="p-3 rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors">
                    <Menu size={24} color="var(--md-sys-color-on-surface)" />
                </button>
            </div>

            {/* FAB (Floating Action Button) - Optional Usage for "New Sale" or similar if needed globally */}
            <div className="mb-8">
                <div className="m3-fab group relative">
                    <Store size={24} />
                    <span className="absolute left-16 bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Nova Venda
                    </span>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 w-full flex flex-col items-center gap-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`
                flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-200
                hover:bg-[var(--md-sys-color-surface-container-highest)]
                ${isActive ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]' : 'text-[var(--md-sys-color-on-surface-variant)]'}
              `}
                        >
                            <div className={`mb-1 ${isActive ? "text-[var(--md-sys-color-on-secondary-container)]" : "text-[var(--md-sys-color-on-surface-variant)]"}`}>
                                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 24 })}
                            </div>
                            <span className="text-[10px] font-medium leading-none tracking-wide">
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Actions if any */}
            <div className="mb-4">
                {/* Profile or other bottom actions */}
            </div>
        </aside>
    );
}
