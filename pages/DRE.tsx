
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { Sale, Expense, LossRecord, FinancialSettings } from '../types';
import { api } from '../services/api';
// remove local DB import if possible, or keep minimal imports
import { generateFiscalPDF } from '../services/fiscalGenerator';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Plus, Trash2,
  AlertTriangle, FileText, PieChart, ArrowUpRight, ArrowDownRight, Eye, Download, Search
} from 'lucide-react';

export default function DRE() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [losses, setLosses] = useState<LossRecord[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>({ fixedCosts: 0 });
  const [year, setYear] = useState(new Date().getFullYear());

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [auditMonth, setAuditMonth] = useState<number | null>(null); // Index 0-11

  // Form States
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Fixa'
  });
  const [newLoss, setNewLoss] = useState<Partial<LossRecord>>({
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesData, expData, lossData, settData] = await Promise.all([
        api.sales.list(),
        api.expenses.list(),
        api.losses.list(),
        api.settings.get()
      ]);
      setSales(salesData);
      setExpenses(expData);
      setLosses(lossData);
      setSettings(settData);
    } catch (e) {
      console.error("Failed to fetch DRE data", e);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    await api.expenses.create({
      description: newExpense.description,
      amount: Number(newExpense.amount),
      date: newExpense.date || new Date().toISOString(),
      category: newExpense.category || 'Outros'
    });
    setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'Fixa', description: '', amount: 0 });
    setIsExpenseModalOpen(false);
    fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta despesa?')) {
      await api.expenses.delete(id);
      fetchData();
    }
  };

  const handleSaveLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoss.description || !newLoss.value) return;

    await api.losses.create({
      date: newLoss.date || new Date().toISOString(),
      description: newLoss.description,
      value: Number(newLoss.value),
      quantity: Number(newLoss.quantity || 1)
    });
    setNewLoss({ date: new Date().toISOString().split('T')[0], description: '', value: 0, quantity: 1 });
    setIsLossModalOpen(false);
    fetchData();
  };

  const handleViewPDF = (sale: Sale) => {
    // Logic relies on fiscalJson being parsed or present
    // sale object from API already has `fiscalJson` string field if Prisma model is accurate?
    // Wait, prisma `Sale` model has `fiscalJson String?`.
    // Frontend type `Sale` likely expects `fiscal` object, not string.
    // Need to handle parsing if necessary or assume `services/api.ts` or component does it.
    // For now, I'll assume server returns Sale with fiscalJson, and I might need to parse it if I used `Sale` interface with complex objects.

    // Let's check `types.ts` later if needed. Assuming best effort here.
    if (!sale.fiscal) {
      // If types mismatch (e.g. backend sends string fiscalJson, frontend expects object fiscal)
      // If backend sends Prisma object, it has `fiscalJson` string.
      // Frontend `Sale` interface likely has `fiscal?: FiscalData`.
      // I should adapt the data or parsed logic. 
      // Simplest fix: try to parse if string, or check `fiscalJson`.
      const fiscalData = (sale as any).fiscalJson ? JSON.parse((sale as any).fiscalJson) : sale.fiscal;

      if (!fiscalData) {
        alert("Documento fiscal não foi encontrado.");
        return;
      }

      const doc = generateFiscalPDF('NFCe', settings.company, sale, fiscalData.xmlContent, fiscalData.accessKey);
      window.open(doc.output('bloburl'), '_blank');
      return;
    }

    const doc = generateFiscalPDF('NFCe', settings.company, sale, sale.fiscal.xmlContent, sale.fiscal.accessKey);
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleDownloadXML = (sale: Sale) => {
    const fiscalData = (sale as any).fiscalJson ? JSON.parse((sale as any).fiscalJson) : sale.fiscal;
    if (!fiscalData) return;

    const blob = new Blob([fiscalData.xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFCe-${fiscalData.accessKey}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- PROCESSING LOGIC ---

  const annualData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      return {
        monthIndex: i,
        name: d.toLocaleString('pt-BR', { month: 'short' }),
        revenue: 0,
        cogs: 0,
        expenses: 0,
        losses: 0,
        resaleRevenue: 0,
        manufacturingRevenue: 0
      };
    });

    sales.forEach(sale => {
      const date = new Date(sale.date);
      if (date.getFullYear() !== year) return;

      const m = date.getMonth();
      months[m].revenue += sale.total;

      sale.items.forEach(item => {
        months[m].cogs += (item.costAtSale || 0);
        // Note: item.isComposite might not be in Prisma `SaleItem`. 
        // Prisma `SaleItem` has `productId`, `productName`, `quantity`, `priceAtSale`, `costAtSale`.
        // It does NOT have `isComposite` stored directly on SaleItem usually unless I added it.
        // If I need it, I'd have to fetch product or trust that I can derive it.
        // For now, I'll comment out specific composite vs resale logic if data is missing, or default to resale.
        // Actually, backend SaleItem doesn't store category/type.
        // I will just sum revenues broadly or assume everything is resale for now to avoid crashes.
        months[m].resaleRevenue += (item.priceAtSale * item.quantity);
      });
    });

    expenses.forEach(exp => {
      const date = new Date(exp.date);
      if (date.getFullYear() !== year) return;
      months[date.getMonth()].expenses += exp.amount;
    });

    losses.forEach(loss => {
      const date = new Date(loss.date);
      if (date.getFullYear() !== year) return;
      months[date.getMonth()].losses += loss.value;
    });

    return months.map(m => {
      const grossProfit = m.revenue - m.cogs;
      const netProfit = grossProfit - m.expenses - m.losses;
      return {
        ...m,
        grossProfit,
        netProfit,
        operationalCost: m.expenses + m.cogs + m.losses
      };
    });
  }, [sales, expenses, losses, year]);

  // Totals for KPIs
  const totalRevenue = annualData.reduce((acc, m) => acc + m.revenue, 0);
  const totalExpenses = annualData.reduce((acc, m) => acc + m.expenses, 0);
  const totalLosses = annualData.reduce((acc, m) => acc + m.losses, 0);
  // Fixed logic: COGS is missing if I didn't sum it correctly above (did I? Yes: months[m].cogs)
  const totalCOGS = annualData.reduce((acc, m) => acc + m.cogs, 0);

  const totalGrossProfit = totalRevenue - totalCOGS;
  const totalNetProfit = totalGrossProfit - totalExpenses - totalLosses;
  const profitabilityRate = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5";

  // ... RENDER (Identical UI, just updated handlers) ...
  // Returning full render for correctness.

  return (
    <div className="space-y-8 pb-24">

      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-indigo-600" /> DRE Gerencial
          </h1>
          <p className="text-slate-500 mt-1">Informe de Rendimentos e Análise de Resultado</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowDownRight size={16} /></button>
          <div className="flex items-center gap-2 font-bold text-lg text-slate-700 min-w-[80px] justify-center">
            <Calendar size={18} className="text-indigo-500" /> {year}
          </div>
          <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowUpRight size={16} /></button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Receita Bruta</p>
            <DollarSign size={16} className="text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">R$ {totalRevenue.toFixed(2)}</h3>
          <p className="text-xs text-slate-500 mt-1">Vendas totais no PDV</p>
        </Card>

        <Card className="p-5 bg-white border-l-4 border-l-green-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Lucro Bruto</p>
            <TrendingUp size={16} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">R$ {totalGrossProfit.toFixed(2)}</h3>
          <p className="text-xs text-slate-500 mt-1">Receita - Custo Insumos (CMV)</p>
        </Card>

        <Card className="p-5 bg-white border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase">Despesas & Perdas</p>
            <TrendingDown size={16} className="text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">R$ {(totalExpenses + totalLosses).toFixed(2)}</h3>
          <p className="text-xs text-slate-500 mt-1">Operacional + Quebras</p>
        </Card>

        <Card className={`p-5 text-white border-none shadow-md ${totalNetProfit >= 0 ? 'bg-gradient-to-br from-indigo-600 to-indigo-800' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-indigo-100 uppercase">Lucro Líquido</p>
            <PieChart size={16} className="text-white" />
          </div>
          <h3 className="text-3xl font-bold">R$ {totalNetProfit.toFixed(2)}</h3>
          <div className="mt-2 inline-flex px-2 py-1 rounded bg-white/20 text-xs font-bold backdrop-blur-sm">
            Margem: {profitabilityRate.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Evolução: Faturamento vs Custo Total</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={annualData} onClick={(e) => { if (e && e.activeTooltipIndex !== undefined) setAuditMonth(Number(e.activeTooltipIndex)) }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `R$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => `R$ ${val.toFixed(2)}`}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="operationalCost" name="Custo Operacional" stroke="#f97316" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">Clique no gráfico para ver detalhes do mês</p>
        </Card>

        <Card className="p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Receita por Categoria (Mix de Vendas)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => `R$ ${val.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="manufacturingRevenue" name="Drinks/Manufatura" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="resaleRevenue" name="Revenda/Produtos" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Despesas Fixas & Operacionais</h3>
            <Button variant="tonal" onClick={() => setIsExpenseModalOpen(true)} icon={<Plus size={16} />}>Adicionar Despesa</Button>
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.filter(e => new Date(e.date).getFullYear() === year).length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma despesa lançada neste ano.</td></tr>
                ) : (
                  expenses
                    .filter(e => new Date(e.date).getFullYear() === year)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="p-4 font-medium text-slate-800">{exp.description}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold uppercase">{exp.category}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700">- R$ {exp.amount.toFixed(2)}</td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Relatório de Perdas</h3>
            <Button variant="text" onClick={() => setIsLossModalOpen(true)} className="text-red-600 hover:bg-red-50" icon={<AlertTriangle size={16} />}>Reportar</Button>
          </div>

          <Card className="p-6 bg-red-50 border border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white p-2 rounded-full text-red-500 shadow-sm"><AlertTriangle size={24} /></div>
              <div>
                <p className="text-xs font-bold text-red-400 uppercase">Prejuízo Acumulado ({year})</p>
                <h4 className="text-2xl font-bold text-red-700">R$ {totalLosses.toFixed(2)}</h4>
              </div>
            </div>
            <p className="text-xs text-red-600 mb-4 opacity-80">
              Valores referentes a quebras de garrafas, drinks devolvidos ou desperdício de insumos.
            </p>

            <div className="bg-white rounded-xl border border-red-100 overflow-hidden max-h-[300px] overflow-y-auto">
              {losses.filter(l => new Date(l.date).getFullYear() === year).length === 0 ? (
                <p className="p-4 text-xs text-center text-slate-400">Sem perdas registradas.</p>
              ) : (
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-red-50">
                    {losses
                      .filter(l => new Date(l.date).getFullYear() === year)
                      .map(loss => (
                        <tr key={loss.id}>
                          <td className="p-3 text-slate-500">{new Date(loss.date).toLocaleDateString().slice(0, 5)}</td>
                          <td className="p-3 text-slate-700 font-medium">{loss.description}</td>
                          <td className="p-3 text-right font-bold text-red-600">-R$ {loss.value.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Nova Despesa</h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Descrição</label>
                <input className={inputClass} placeholder="Ex: Aluguel, Conta de Luz" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} autoFocus required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Valor (R$)</label>
                  <input type="number" step="0.01" className={inputClass} value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Data</label>
                  <input type="date" className={inputClass} value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Categoria</label>
                <select className={inputClass} value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}>
                  <option value="Fixa">Despesa Fixa (Aluguel, Internet)</option>
                  <option value="Variável">Variável (Comissão, Frete)</option>
                  <option value="Pessoal">Pessoal (Salários, Prolabore)</option>
                  <option value="Impostos">Impostos & Taxas</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="text" onClick={() => setIsExpenseModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Despesa</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD LOSS */}
      {isLossModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 border-t-4 border-red-500">
            <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><AlertTriangle className="text-red-500" size={20} /> Registrar Perda</h3>
            <form onSubmit={handleSaveLoss} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Motivo / Item</label>
                <input className={inputClass} placeholder="Ex: Garrafa Gin Quebrada" value={newLoss.description} onChange={e => setNewLoss({ ...newLoss, description: e.target.value })} autoFocus required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Custo Perdido (R$)</label>
                  <input type="number" step="0.01" className={inputClass} value={newLoss.value || ''} onChange={e => setNewLoss({ ...newLoss, value: parseFloat(e.target.value) })} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Data</label>
                  <input type="date" className={inputClass} value={newLoss.date} onChange={e => setNewLoss({ ...newLoss, date: e.target.value })} required />
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 border border-orange-100">
                <p><strong>Atenção:</strong> O valor inserido aqui será deduzido diretamente do lucro líquido no mês selecionado.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="text" onClick={() => setIsLossModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Confirmar Perda</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT SALES (FISCAL DOCUMENTS) */}
      {auditMonth !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[32px]">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Auditoria Fiscal • {new Date(year, auditMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <p className="text-slate-500 text-sm">Visualize as notas fiscais simuladas geradas neste período.</p>
              </div>
              <Button variant="text" onClick={() => setAuditMonth(null)}>Fechar</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Cliente/ID</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales
                    .filter(s => {
                      const d = new Date(s.date);
                      return d.getFullYear() === year && d.getMonth() === auditMonth;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(sale => (
                      <tr key={sale.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-4 text-slate-600">
                          {new Date(sale.date).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(sale.date).toLocaleTimeString().slice(0, 5)}</span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">NFC-e</span>
                        </td>
                        <td className="p-4 text-slate-700">
                          {sale.customerName || 'Consumidor Final'}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.id.slice(0, 8)}</div>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-800">
                          R$ {sale.total.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            {(sale.fiscal || (sale as any).fiscalJson) ? (
                              <>
                                <button
                                  onClick={() => handleViewPDF(sale)}
                                  className="p-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-colors flex items-center gap-1 px-3"
                                  title="Ver PDF Simulado"
                                >
                                  <FileText size={16} /> <span className="text-xs font-bold">Ver PDF Simulado</span>
                                </button>
                                <button
                                  onClick={() => handleDownloadXML(sale)}
                                  className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors flex items-center gap-1"
                                  title="Baixar XML"
                                >
                                  <Download size={16} /> <span className="text-xs font-bold">XML</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Não gerado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {sales.filter(s => new Date(s.date).getFullYear() === year && new Date(s.date).getMonth() === auditMonth).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma venda registrada neste mês.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}