import React from 'react';
import NavigationRail from './NavigationRail';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }: { children?: React.ReactNode }) {
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] font-sans">
            <NavigationRail />

            {/* Mobile Drawer / Bottom Bar would go here for mobile support */}

            <main className="flex-1 md:ml-[80px] p-4 md:p-6 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
