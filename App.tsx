import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { seedDatabase } from './services/db';
import { ToastProvider } from './contexts/ToastContext';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Delivery from './pages/Delivery';
import DRE from './pages/DRE';
import Settings from './pages/Settings';

export default function App() {
  // useEffect(() => {
  //   seedDatabase();
  // }, []);

  return (
    <HashRouter>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dre" element={<DRE />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </HashRouter>
  );
}
