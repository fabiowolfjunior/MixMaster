import React, { useState, useEffect } from 'react';
import {
    Plus, Building2, User, Search, Filter,
    MoreVertical, Phone, Mail, MapPin, Edit2,
    Check, X, Briefcase, Truck, ShoppingBag,
    Wrench, UserCheck, Percent
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';

// --- Types ---
interface Supplier {
    id: string;
    name: string;
    legalName?: string;
    type: 'PJ' | 'PF';
    document: string;
    roles: string[];
    email?: string;
    phone?: string;
    address?: string;
}

const ROLES = [
    { label: 'Fornecedor', color: 'bg-blue-100 text-blue-700' },
    { label: 'Cliente', color: 'bg-green-100 text-green-700' },
    { label: 'Transportadora', color: 'bg-orange-100 text-orange-700' },
    { label: 'Colaborador', color: 'bg-purple-100 text-purple-700' }
];

export default function Suppliers() {
    const { showToast } = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const initialFormState: Partial<Supplier> = {
        type: 'PJ',
        roles: ['Fornecedor'],
        name: '',
        legalName: '',
        document: '',
        email: '',
        phone: '',
        address: ''
    };
    const [formData, setFormData] = useState<Partial<Supplier>>(initialFormState);

    // --- Effects ---
    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const data = await api.suppliers.list();
            setSuppliers(data);
        } catch (error) {
            console.error("Erro ao carregar parceiros:", error);
            showToast("Erro ao carregar lista de parceiros", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setFormData({ ...supplier });
            setEditingId(supplier.id);
        } else {
            setFormData({ ...initialFormState });
            setEditingId(null);
        }
        setIsModalOpen(true);
    };

    const handleValidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.document) {
            showToast("Nome e Documento são obrigatórios", "error");
            return;
        }

        try {
            const payload = {
                name: formData.name,
                legalName: formData.legalName,
                type: formData.type,
                document: formData.document,
                roles: formData.roles,
                email: formData.email,
                phone: formData.phone,
                address: formData.address
            };

            // NOTE: Currently API only supports Create (POST). 
            // Update (PUT) logic would go here if/when backend supports it.
            if (editingId) {
                // await api.suppliers.update(editingId, payload); 
                showToast("Edição ainda não implementada no servidor (MVP)", "info");
            } else {
                await api.suppliers.create(payload);
                showToast("Parceiro cadastrado com sucesso!", "success");
            }

            setIsModalOpen(false);
            loadSuppliers();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar parceiro", "error");
        }
    };

    const toggleRole = (role: string) => {
        const currentRoles = formData.roles || [];
        if (currentRoles.includes(role)) {
            setFormData({ ...formData, roles: currentRoles.filter(r => r !== role) });
        } else {
            setFormData({ ...formData, roles: [...currentRoles, role] });
        }
    };

    // --- Filtering ---
    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col gap-6 fade-in">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--md-sys-color-on-surface)]">Parceiros</h1>
                    <p className="text-[var(--md-sys-color-on-surface-variant)]">
                        Gerencie clientes, fornecedores e colaboradores
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar parceiro..."
                            className="pl-10 pr-4 py-2 rounded-full border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)] outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
                        Novo
                    </Button>
                </div>
            </header>

            {/* List */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {filteredSuppliers.map(supplier => (
                        <div
                            key={supplier.id}
                            className="group relative bg-[var(--md-sys-color-surface-container-low)] p-5 rounded-[20px] border border-[var(--md-sys-color-outline-variant)] hover:shadow-md transition-all cursor-pointer"
                            onClick={() => handleOpenModal(supplier)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                                    ${supplier.type === 'PJ' ? 'bg-indigo-100 text-indigo-700' : 'bg- emerald-100 text-emerald-700'}
                                `}>
                                    {supplier.type === 'PJ' ? <Building2 size={24} /> : <User size={24} />}
                                </div>
                                <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
                                    {supplier.roles.map(role => (
                                        <span key={role} className="text-[10px] px-2 py-1 rounded-full bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] font-medium">
                                            {role}
                                        </span>
                                    ))}
                                    <div className="flex gap-2 relative z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(supplier); }}
                                            className="p-2 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded-full transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Excluir este parceiro?')) {
                                                    await api.suppliers.delete(supplier.id);
                                                    showToast("Parceiro excluído", "success");
                                                    loadSuppliers();
                                                }
                                            }}
                                            className="p-2 text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] rounded-full transition-colors"
                                            title="Excluir"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-[var(--md-sys-color-on-surface)] mb-1">{supplier.name}</h3>
                            <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mb-4">{supplier.legalName || supplier.document}</p>

                            <div className="space-y-2">
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                                        <Phone size={14} /> {supplier.phone}
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--md-sys-color-on-surface-variant)]">
                                        <Mail size={14} /> {supplier.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredSuppliers.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-[var(--md-sys-color-outline)]">
                            <UserCheck size={48} className="mb-4 opacity-50" />
                            <p>Nenhum parceiro encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--md-sys-color-surface)] w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--md-sys-color-outline-variant)] flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingId ? 'Editar Parceiro' : 'Novo Parceiro'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleValidSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Type Selection */}
                            <div className="flex p-1 bg-[var(--md-sys-color-surface-container-high)] rounded-lg w-fit">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'PJ', document: '' })}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'PJ' ? 'bg-[var(--md-sys-color-surface)] shadow-sm' : 'opacity-70'}`}
                                >
                                    Pessoa Jurídica
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'PF', document: '' })}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'PF' ? 'bg-[var(--md-sys-color-surface)] shadow-sm' : 'opacity-70'}`}
                                >
                                    Pessoa Física
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">
                                        {formData.type === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 ring-indigo-500"
                                        value={formData.document}
                                        onChange={e => setFormData({ ...formData, document: e.target.value })}
                                        placeholder={formData.type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">
                                        Nome Principal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 ring-indigo-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nome Fantasia ou Apelido"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">
                                    {formData.type === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                                </label>
                                <input
                                    className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 ring-indigo-500"
                                    value={formData.legalName}
                                    onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 ring-indigo-500"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Telefone</label>
                                    <input
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 ring-indigo-500"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Funções</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Fornecedor', 'Cliente', 'Transportadora', 'Colaborador'].map(role => {
                                        const isActive = formData.roles?.includes(role);
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => toggleRole(role)}
                                                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
                                                    ${isActive
                                                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                                        : 'border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-black/5'}
                                                `}
                                            >
                                                {role}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-[var(--md-sys-color-outline-variant)] flex justify-end gap-3">
                            <Button variant="text" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={(e) => handleValidSubmit(e as any)}>Salvar Parceiro</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
