import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../services/api';

export default function Dashboard() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    lowStockCount: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [transactions, inventory] = await Promise.all([
          api.sales.list(),
          api.ingredients.list()
        ]);

        const salesByDay = transactions.reduce((acc: any, t: any) => {
          const date = new Date(t.date).toLocaleDateString('pt-BR', { weekday: 'short' });
          acc[date] = (acc[date] || 0) + t.total;
          return acc;
        }, {});

        const chartData = Object.entries(salesByDay).map(([name, value]) => ({
          name,
          vendas: value
        })).slice(-7); // Last 7 days

        setSalesData(chartData);

        // Calculate Stats
        const totalSales = transactions.reduce((sum: number, t: any) => sum + t.total, 0);
        const totalOrders = transactions.length;
        // Using any for inventory item strictly for property access safety if type differs
        const lowStockCount = inventory.filter((i: any) => i.currentStock <= i.minStock).length;

        // Mock profit calculation (assuming 30% margin for demo)
        const totalProfit = totalSales * 0.3;

        setStats({
          totalSales,
          totalProfit,
          totalOrders,
          lowStockCount
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };

    loadData();
    // Simulate real-time updates for effect
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, colorClass }: any) => (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <Icon size={80} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-current`}>
            <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
          </div>
          <span className="text-sm font-medium text-slate-500">{title}</span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-2xl font-bold font-display text-slate-800">{value}</h3>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{trendValue} vs. mês anterior</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up stagger-1">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do desempenho da sua loja</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block group">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-64 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span>Hoje</span>
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up stagger-2">
        <StatCard
          title="Faturamento Total"
          value={`R$ ${stats.totalSales.toFixed(2)}`}
          icon={DollarSign}
          trend="up"
          trendValue="+12.5%"
          colorClass="text-emerald-600"
        />
        <StatCard
          title="Lucro Estimado"
          value={`R$ ${stats.totalProfit.toFixed(2)}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8.2%"
          colorClass="text-indigo-600"
        />
        <StatCard
          title="Total de Pedidos"
          value={stats.totalOrders}
          icon={Package}
          trend="down"
          trendValue="-2.1%"
          colorClass="text-blue-500"
        />
        <StatCard
          title="Estoque Baixo"
          value={`${stats.lowStockCount} itens`}
          icon={AlertTriangle}
          colorClass="text-amber-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger-3">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold font-display text-slate-800">Vendas da Semana</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 font-medium text-slate-600 focus:ring-0 cursor-pointer hover:bg-slate-100">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ stroke: '#4F46E5', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel / Recent Activity */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-bold font-display text-slate-800 mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            {salesData.length > 0 ? (
              // Only showing placeholder if no real data logic for recent activity list is mapped
              [1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Package size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Venda #102{i}</p>
                    <p className="text-xs text-slate-500">Há {i * 15 + 5} minutos</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">+R$ {(Math.random() * 100).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">Nenhuma atividade recente.</p>
            )}
          </div>
          <button className="w-full mt-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
            Ver Todas as Vendas
          </button>
        </div>
      </div>
    </div>
  );
}
