import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar, User, Search, Plus, CheckCircle2, Clock, Package, MoreVertical, X } from 'lucide-react';
import { api } from '../services/api';

export default function Delivery() {
    const [activeTab, setActiveTab] = useState<'board' | 'drivers'>('board');
    const [boardView, setBoardView] = useState<'planning' | 'active' | 'history'>('planning');

    const [drivers, setDrivers] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [pendingSales, setPendingSales] = useState<any[]>([]);

    // Selection state for route creation
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);

    // Modal State
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', phone: '', license: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [dDb, rDb, sDb] = await Promise.all([
                api.drivers.list(),
                api.routes.list(),
                api.sales.list()
            ]);
            setDrivers(dDb);
            setRoutes(rDb);

            // Filter sales that are NOT in any route yet (naive frontend filtering for MVP)
            // A more robust way: backend endpoint returning only unassigned sales
            const assignedSaleIds = new Set();
            rDb.forEach((r: any) => r.items.forEach((i: any) => assignedSaleIds.add(i.saleId)));

            setPendingSales(sDb.filter((s: any) => !assignedSaleIds.has(s.id)));

        } catch (e) {
            console.error("Error loading delivery data", e);
        }
    };

    const handleCreateDriver = async () => {
        if (!newDriver.name) return;
        await api.drivers.create(newDriver);
        setShowDriverModal(false);
        setNewDriver({ name: '', phone: '', license: '' });
        fetchData();
    };

    const handleCreateRoute = async () => {
        if (!selectedDriverId || selectedSaleIds.length === 0) return;
        try {
            await api.routes.create({
                driverId: selectedDriverId,
                saleIds: selectedSaleIds
            });
            fetchData();
            setSelectedSaleIds([]);
            setSelectedDriverId('');
            setBoardView('active'); // Switch to view the new route
        } catch (e) {
            alert('Falha ao criar rota');
        }
    };

    const toggleSaleSelection = (saleId: string) => {
        if (selectedSaleIds.includes(saleId)) {
            setSelectedSaleIds(selectedSaleIds.filter(id => id !== saleId));
        } else {
            setSelectedSaleIds([...selectedSaleIds, saleId]);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[var(--md-sys-color-background)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--md-sys-color-surface)] border-b border-[var(--md-sys-color-outline-variant)]">
                <div className="flex items-center gap-4">
                    <Truck size={28} className="text-[var(--md-sys-color-primary)]" />
                    <div>
                        <h1 className="text-xl font-bold text-[var(--md-sys-color-on-surface)]">Logística e Entregas</h1>
                        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Gestão de rotas e motoristas</p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex bg-[var(--md-sys-color-surface-container)] p-1 rounded-full border border-[var(--md-sys-color-outline-variant)]">
                    <button
                        onClick={() => setActiveTab('board')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'board' ? 'bg-[var(--md-sys-color-tertiary)] text-[var(--md-sys-color-on-tertiary)] shadow-sm' : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'}`}
                    >
                        Rotas
                    </button>
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'drivers' ? 'bg-[var(--md-sys-color-tertiary)] text-[var(--md-sys-color-on-tertiary)] shadow-sm' : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'}`}
                    >
                        Motoristas
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">

                {/* --- DRIVERS TAB --- */}
                {activeTab === 'drivers' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">Frota e Motoristas</h2>
                            <button onClick={() => setShowDriverModal(true)} className="m3-fab-extended bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]">
                                <Plus size={20} />
                                <span>Novo Motorista</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {drivers.map(driver => (
                                <div key={driver.id} className="bg-[var(--md-sys-color-surface-container-low)] p-6 rounded-[var(--radius-lg)] border border-[var(--md-sys-color-outline-variant)] flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-primary)] font-bold text-lg">
                                        {driver.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--md-sys-color-on-surface)]">{driver.name}</h3>
                                        <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">{driver.phone || 'Sem telefone'}</p>
                                        <p className="text-xs text-[var(--md-sys-color-outline)] mt-1">CNH: {driver.license || '--'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- ROUTES BOARD TAB --- */}
                {activeTab === 'board' && (
                    <div className="h-full flex flex-col">

                        {/* Sub-tabs for Board */}
                        <div className="flex gap-4 mb-6 border-b border-[var(--md-sys-color-outline-variant)]/50 pb-1">
                            <button onClick={() => setBoardView('planning')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${boardView === 'planning' ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}>
                                Planejamento
                            </button>
                            <button onClick={() => setBoardView('active')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${boardView === 'active' ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}>
                                Em Rota ({routes.filter(r => r.status === 'pending').length})
                            </button>
                            <button onClick={() => setBoardView('history')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${boardView === 'history' ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)]'}`}>
                                Histórico
                            </button>
                        </div>

                        {/* PLANNING VIEW */}
                        {boardView === 'planning' && (
                            <div className="flex-1 flex gap-6 overflow-hidden">
                                {/* Left: Pending Sales */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <h3 className="font-bold text-[var(--md-sys-color-on-surface)] mb-4 flex items-center gap-2">
                                        <Package size={20} className="text-[var(--md-sys-color-secondary)]" />
                                        Pedidos Pendentes ({pendingSales.length})
                                    </h3>
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                        {pendingSales.map(sale => {
                                            const isSelected = selectedSaleIds.includes(sale.id);
                                            return (
                                                <div
                                                    key={sale.id}
                                                    onClick={() => toggleSaleSelection(sale.id)}
                                                    className={`
                                                        p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all
                                                        ${isSelected
                                                            ? 'bg-[var(--md-sys-color-secondary-container)] border-[var(--md-sys-color-secondary)] ring-1 ring-[var(--md-sys-color-secondary)]'
                                                            : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-secondary)]'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-[var(--md-sys-color-on-surface)]">
                                                            #{sale.id.slice(0, 8)} - {sale.customerName || 'Consumidor Final'}
                                                        </span>
                                                        <span className="text-xs font-mono bg-[var(--md-sys-color-surface-variant)] px-2 py-1 rounded">
                                                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mb-2">
                                                        {sale.items.length} itens • R$ {sale.total.toFixed(2)}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-xs text-[var(--md-sys-color-outline)]">
                                                        <MapPin size={12} />
                                                        <span>Endereço não cadastrado (Cliente Balcão)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {pendingSales.length === 0 && (
                                            <div className="text-center py-12 text-[var(--md-sys-color-outline)]">
                                                Nenhum pedido pendente para entrega.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Action / Draft Route */}
                                <div className="w-96 bg-[var(--md-sys-color-surface-container-high)] rounded-[var(--radius-xl)] p-6 flex flex-col border border-[var(--md-sys-color-outline-variant)]/40 shadow-xl">
                                    <h3 className="font-bold text-lg mb-6">Nova Rota de Entrega</h3>

                                    <div className="space-y-6 flex-1">
                                        <div>
                                            <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase mb-2 block">Motorista Responsável</label>
                                            <select
                                                className="w-full bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)] rounded-lg px-4 py-3 outline-none focus:border-[var(--md-sys-color-primary)] text-sm"
                                                value={selectedDriverId}
                                                onChange={e => setSelectedDriverId(e.target.value)}
                                            >
                                                <option value="">Selecione um motorista...</option>
                                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="bg-[var(--md-sys-color-surface)] p-4 rounded-lg border border-[var(--md-sys-color-outline-variant)]/40">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-[var(--md-sys-color-on-surface-variant)]">Pedidos Selecionados</span>
                                                <span className="font-bold text-[var(--md-sys-color-on-surface)]">{selectedSaleIds.length}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--md-sys-color-on-surface-variant)]">Valor Total da Carga</span>
                                                <span className="font-bold text-[var(--md-sys-color-primary)]">
                                                    R$ {pendingSales.filter(s => selectedSaleIds.includes(s.id)).reduce((a, b) => a + b.total, 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={!selectedDriverId || selectedSaleIds.length === 0}
                                        onClick={handleCreateRoute}
                                        className="w-full mt-4 py-4 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-lg disabled:opacity-50 disabled:shadow-none transition-all hover:bg-[var(--md-sys-color-primary-container)] hover:text-[var(--md-sys-color-on-primary-container)]"
                                    >
                                        Gerar Rota e Expedir
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ACTIVE / HISTORY VIEW */}
                        {(boardView === 'active' || boardView === 'history') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-6">
                                {routes
                                    .filter(r => boardView === 'active' ? r.status !== 'completed' : r.status === 'completed')
                                    .map(route => (
                                        <div key={route.id} className="bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            <div className="bg-[var(--md-sys-color-surface-container)] p-4 flex justify-between items-center border-b border-[var(--md-sys-color-outline-variant)]/20">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <User size={16} className="text-[var(--md-sys-color-primary)]" />
                                                        <span className="font-bold text-sm text-[var(--md-sys-color-on-surface)]">{route.driver?.name || 'Motorista Desconhecido'}</span>
                                                    </div>
                                                    <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                                                        {new Date(route.date).toLocaleDateString()} • {new Date(route.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${route.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {route.status === 'pending' ? 'Em Rota' : route.status}
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <div className="mb-4 flex gap-4 text-sm">
                                                    <div>
                                                        <p className="text-[var(--md-sys-color-outline)] text-xs">Entregas</p>
                                                        <p className="font-bold text-[var(--md-sys-color-on-surface)]">{route.items.length}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[var(--md-sys-color-outline)] text-xs">Valor Total</p>
                                                        <p className="font-bold text-[var(--md-sys-color-on-surface)]">
                                                            R$ {route.items.reduce((acc: number, item: any) => acc + item.sale.total, 0).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {route.items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-[var(--md-sys-color-surface-container-low)]">
                                                            <span className="font-medium text-[var(--md-sys-color-on-surface)]">#{item.saleId.slice(0, 6)}...</span>
                                                            <span className={`${item.status === 'delivered' ? 'text-green-600' : 'text-gray-500'}`}>{item.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] border-t border-[var(--md-sys-color-outline-variant)]/20 flex justify-end">
                                                <button className="text-[var(--md-sys-color-primary)] text-sm font-bold hover:underline">Ver Detalhes</button>
                                            </div>
                                        </div>
                                    ))}
                                {routes.length === 0 && (
                                    <div className="col-span-3 text-center py-12 text-[var(--md-sys-color-outline)]">
                                        Nenhuma rota encontrada.
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* NEW DRIVER MODAL */}
            {showDriverModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-[var(--md-sys-color-surface-container-high)] rounded-[var(--radius-xl)] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] mb-4">Adicionar Motorista</h3>
                        <div className="space-y-4">
                            <input
                                className="w-full bg-[var(--md-sys-color-surface-container-highest)] border-b border-[var(--md-sys-color-outline)] rounded-t-lg px-4 py-3 outline-none"
                                placeholder="Nome Completo"
                                value={newDriver.name}
                                onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                autoFocus
                            />
                            <input
                                className="w-full bg-[var(--md-sys-color-surface-container-highest)] border-b border-[var(--md-sys-color-outline)] rounded-t-lg px-4 py-3 outline-none"
                                placeholder="Telefone"
                                value={newDriver.phone}
                                onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                            />
                            <input
                                className="w-full bg-[var(--md-sys-color-surface-container-highest)] border-b border-[var(--md-sys-color-outline)] rounded-t-lg px-4 py-3 outline-none"
                                placeholder="CNH"
                                value={newDriver.license}
                                onChange={e => setNewDriver({ ...newDriver, license: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowDriverModal(false)} className="px-4 py-2 rounded-full font-medium text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-variant)] transition-colors">Cancelar</button>
                            <button onClick={handleCreateDriver} className="px-6 py-2 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold hover:shadow-md transition-shadow">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
