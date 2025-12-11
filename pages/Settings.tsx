
import React, { useEffect, useState } from 'react';
import { Save, Building2, QrCode, Store, MapPin, Upload, Image as ImageIcon, AlertTriangle, Calculator, Settings as SettingsIcon } from 'lucide-react';
import { FinancialSettings } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Settings() {
    const [settings, setSettings] = useState<FinancialSettings>({ fixedCosts: 0 });
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.settings.get();
            setSettings(data);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.settings.upsert(settings);
            setSuccessMsg("Configurações salvas com sucesso!");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (e) {
            alert("Erro ao salvar configurações");
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const inputClass = "w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm";
    const labelClass = "block text-sm font-medium text-slate-700 mb-1";

    return (
        <div className="space-y-6 pb-24 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <SettingsIcon className="text-indigo-600" /> Configurações
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie dados da empresa, impressão e financeiro.</p>
                </div>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-6">

                {/* IDENTIDADE E LOGO */}
                <Card className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Store size={20} className="text-indigo-500" /> Identidade Visual & Cupom
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Nome Fantasia (Cabeçalho do Cupom)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400"><Store size={16} /></span>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={settings.storeName || ''}
                                    onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                                    placeholder="Ex: MixMaster Bar"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Este nome aparecerá em destaque no topo dos cupons impressos.</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className={labelClass}>Logomarca</label>
                            <div className="flex items-center gap-4">
                                {settings.logo ? (
                                    <div className="relative group">
                                        <img src={settings.logo} alt="Logo" className="h-20 w-20 object-contain rounded-lg border border-slate-100 p-1 bg-white" />
                                        <button
                                            type="button"
                                            onClick={() => setSettings(prev => ({ ...prev, logo: undefined }))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <AlertTriangle size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-20 w-20 bg-white border border-slate-200 border-dashed rounded-lg flex items-center justify-center text-slate-300">
                                        <ImageIcon size={24} />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
                                        <Upload size={16} /> Carregar Imagem
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-1">Recomendado: PNG Fundo Transparente ou JPG Branco. Max 500KB.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* DADOS FISCAIS */}
                <Card className="p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Building2 size={20} className="text-indigo-500" /> Dados da Empresa (Fiscal)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Razão Social</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400"><Building2 size={16} /></span>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={settings.company?.legalName || ''}
                                    onChange={e => setSettings({ ...settings, company: { ...settings.company, legalName: e.target.value } })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>CNPJ</label>
                            <input
                                type="text"
                                className={`${inputClass} pl-3`}
                                value={settings.company?.cnpj || ''}
                                onChange={e => setSettings({ ...settings, company: { ...settings.company, cnpj: e.target.value } })}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Inscrição Estadual</label>
                            <input
                                type="text"
                                className={`${inputClass} pl-3`}
                                value={settings.company?.ie || ''}
                                onChange={e => setSettings({ ...settings, company: { ...settings.company, ie: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Regime Tributário</label>
                            <select
                                className={`${inputClass} pl-3`}
                                value={settings.company?.regime || 'Simples Nacional'}
                                onChange={e => setSettings({ ...settings, company: { ...settings.company, regime: e.target.value as any } })}
                            >
                                <option value="Simples Nacional">Simples Nacional</option>
                                <option value="Lucro Presumido">Lucro Presumido</option>
                                <option value="Lucro Real">Lucro Real</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Endereço Completo</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400"><MapPin size={16} /></span>
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={settings.company?.address || ''}
                                    onChange={e => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* FINANCEIRO E PIX */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Calculator size={20} className="text-indigo-500" /> Parâmetros Financeiros
                        </h3>
                        <div>
                            <label className={labelClass}>Custos Fixos Mensais (Estimado)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={settings.fixedCosts}
                                    onChange={e => setSettings({ ...settings, fixedCosts: parseFloat(e.target.value) })}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Utilizado para o cálculo do Ponto de Equilíbrio no Dashboard. Para precisão, utilize o módulo DRE lançando despesas reais.
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 bg-indigo-50 border border-indigo-100">
                        <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 border-b border-indigo-200 pb-2">
                            <QrCode size={20} className="text-indigo-700" /> PIX Integrado
                        </h3>
                        <div>
                            <label className="block text-sm font-bold text-indigo-800 mb-1">Chave PIX</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-indigo-900 placeholder-indigo-300"
                                value={settings.pixKey || ''}
                                onChange={e => setSettings({ ...settings, pixKey: e.target.value })}
                                placeholder="CPF, CNPJ, Email, Tel ou Aleatória"
                            />
                            <p className="text-xs text-indigo-600 mt-2">
                                Ao configurar, o PDV irá gerar automaticamente um QR Code Dinâmico (padrão EMV) para cada venda.
                            </p>
                        </div>
                    </Card>
                </div>

                <div className="fixed bottom-6 right-6 md:static md:flex md:justify-end">
                    <Button type="submit" className="shadow-xl md:shadow-none h-14 md:h-10 px-8" icon={<Save size={18} />}>
                        Salvar Alterações
                    </Button>
                </div>
            </form>

            {successMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-medium animate-in slide-in-from-bottom-5 z-[70] flex items-center gap-2">
                    <Store size={18} /> {successMsg}
                </div>
            )}
        </div>
    );
}
