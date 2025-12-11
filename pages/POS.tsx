
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Minus, Plus, CreditCard, Banknote, QrCode, CheckCircle, Trash2, Tag, X, Printer, ArrowRight, ScanBarcode, Wallet, AlertCircle, User, UserPlus, Building2 } from 'lucide-react';
import { Product, CartItem, Sale, FinancialSettings, Supplier } from '../types';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import * as db from '../services/db'; // Keep for some types or helpers if needed, but logic moves to api

// --- HELPERS ---

// Gera o Payload "Copia e Cola" do Pix (Padrão EMV QRCPS-MPM)
const generatePixPayload = (key: string, name: string, city: string, amount: number) => {
    const amountStr = amount.toFixed(2);
    const keyStr = key.trim();
    const nameStr = name.substring(0, 25).trim();
    const cityStr = city.substring(0, 15).trim();

    const format = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const merchantAccount = format('00', 'br.gov.bcb.pix') + format('01', keyStr);

    let payload =
        format('00', '01') +
        format('26', merchantAccount) +
        format('52', '0000') +
        format('53', '986') +
        format('54', amountStr) +
        format('58', 'BR') +
        format('59', nameStr || 'LOJA') +
        format('60', cityStr || 'CIDADE') +
        format('62', format('05', '***'));

    payload += '6304'; // CRC16 ID

    // CRC16 Calculation
    const poly = 0x1021;
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ poly;
            else crc = (crc << 1);
        }
    }

    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

export default function POS() {
    // Dados
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Supplier[]>([]);
    const [settings, setSettings] = useState<FinancialSettings>({ fixedCosts: 0 });

    // Estado UI Catalog
    const [activeCategory, setActiveCategory] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Estado Carrinho & Venda
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Supplier | null>(null);

    // Modals
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Sale['paymentMethod'] | null>(null);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load Initial Data
    useEffect(() => {
        // Load customers and settings on mount
        api.suppliers.list().then(setCustomers);
        // api.settings.get().then(setSettings); // Assuming api.settings endpoint exists or fallback
        setSettings(db.getFinancialSettings()); // Fallback to local for settings until migrated
    }, []);

    // Search & Products Binding (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            api.products.list(searchTerm).then(setProducts);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Barcode Auto-Add Logic
    useEffect(() => {
        if (searchTerm && products.length > 0) {
            // Precise match for barcode
            const match = products.find(p => p.barcode === searchTerm);
            if (match) {
                addToCart(match);
                setSearchTerm('');
            }
        }
    }, [searchTerm, products]);

    // Derived Data
    const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)], [products]);

    const filteredProducts = products.filter(p => {
        // Search is handled by API, so we just filter by category client-side if needed 
        // OR we could trust API returns what we want.
        // For category:
        const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
        return matchCat;
    });

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Actions
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1, cartId: crypto.randomUUID() }];
        });
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }).filter(i => i.quantity > 0));
    };

    const handleCheckout = async (method: Sale['paymentMethod']) => {
        const saleData = {
            total: cartTotal,
            paymentMethod: method,
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name,
            items: cart.map(c => ({
                productId: c.id,
                productName: c.name,
                quantity: c.quantity,
                priceAtSale: c.price
            }))
        };

        try {
            const sale = await api.sales.create(saleData);
            setLastSale(sale);
            setCart([]);
            setPaymentModalOpen(false);
            setSelectedPaymentMethod(null);
            setSelectedCustomer(null);
            setSuccessModalOpen(true);
        } catch (e: any) {
            setErrorMsg(e.message || 'Erro ao processar venda');
            setTimeout(() => setErrorMsg(null), 3000);
        }
    };

    const handlePrint = () => {
        if (!lastSale) return;

        const dateObj = new Date(lastSale.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const win = window.open('', '_blank', 'width=380,height=600');
        if (win) {
            win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Cupom #${lastSale.id.slice(0, 4)}</title>
                <style>
                    @media print { 
                        @page { margin: 0; size: auto; }
                        body { margin: 0; padding: 0; }
                    }
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 300px; 
                        margin: 0 auto; 
                        padding: 10px;
                        font-size: 12px;
                        color: #000;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-lg { font-size: 16px; } 
                    .text-xl { font-size: 18px; }
                    .mb-1 { margin-bottom: 4px; }
                    .mb-2 { margin-bottom: 8px; }
                    .mt-2 { margin-top: 8px; }
                    .border-b { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .logo { max-width: 120px; max-height: 80px; margin: 0 auto 8px auto; display: block; object-fit: contain; }
                    .item-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
                    .item-col { display: flex; flex-direction: column; }
                    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
                    .footer { font-size: 10px; text-align: center; margin-top: 15px; }
                </style>
            </head>
            <body>
                ${settings.logo ? `<div class="text-center"><img src="${settings.logo}" class="logo" /></div>` : ''}
                
                <div class="text-center">
                    <div class="font-bold text-xl mb-1">${settings.company?.legalName || settings.storeName?.toUpperCase() || 'MIXMASTER'}</div>
                    ${settings.company?.address ? `<div style="font-size:10px">${settings.company.address}</div>` : ''}
                    ${settings.company?.cnpj ? `<div style="font-size:10px">CNPJ: ${settings.company.cnpj}</div>` : ''}
                    ${settings.company?.ie ? `<div style="font-size:10px">IE: ${settings.company.ie}</div>` : ''}
                    <div style="font-size:10px; margin-top:4px;">${dateStr} ${timeStr}</div>
                </div>

                <div class="border-b"></div>

                <div class="text-center mb-2 font-bold">
                    PEDIDO #${lastSale.id.slice(0, 4).toUpperCase()}
                </div>

                ${lastSale.customerName ? `
                <div class="mb-2" style="font-size:11px">
                    <strong>CLIENTE:</strong> ${lastSale.customerName.toUpperCase()}<br/>
                </div>
                ` : ''}

                <div class="border-b"></div>

                <div>
                    ${lastSale.items.map((item, idx) => `
                        <div style="margin-bottom:6px;">
                            <div class="font-bold" style="font-size:11px;">${item.productName}</div>
                            <div class="item-row">
                                <span style="font-size:11px;">${item.quantity} x R$ ${item.priceAtSale.toFixed(2)}</span>
                                <span class="font-bold">R$ ${(item.quantity * item.priceAtSale).toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="border-b"></div>

                <div class="total-row text-xl">
                    <span>TOTAL</span>
                    <span>R$ ${lastSale.total.toFixed(2)}</span>
                </div>
                
                <div class="item-row mt-2" style="font-size:11px;">
                    <span>PAGAMENTO:</span>
                    <span style="font-weight:bold; text-transform:uppercase;">
                        ${lastSale.paymentMethod === 'credit' ? 'CRÉDITO' :
                    lastSale.paymentMethod === 'debit' ? 'DÉBITO' :
                        lastSale.paymentMethod === 'pix' ? 'PIX' : 'DINHEIRO'}
                    </span>
                </div>

                <div class="border-b"></div>

                <div class="footer">
                    Obrigado pela preferência!<br/>
                    Volte sempre!<br/>
                    <br/>
                    ** NÃO É DOCUMENTO FISCAL **
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        }
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-4 overflow-hidden">

            {/* ESQUERDA: Catálogo */}
            <div className="flex-1 flex flex-col gap-4 bg-white rounded-[24px] p-4 shadow-sm border border-slate-100">
                {/* Header Catálogo */}
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Buscar produto ou bipar código..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            <ScanBarcode className="absolute right-3 top-3 text-slate-400" size={20} />
                        </div>
                    </div>

                    {/* Categorias */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                            ${activeCategory === cat
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid Produtos (Sem Imagens) */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Tag size={48} strokeWidth={1} />
                            <p className="mt-2 font-medium">Nenhum produto cadastrado</p>
                            <p className="text-sm">Cadastre produtos para começar a vender.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="group flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-md transition-all text-left active:scale-[0.98] h-32"
                                >
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{product.name}</h3>
                                        {product.category && <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide block">{product.category}</span>}
                                    </div>
                                    <div className="mt-2 flex justify-between items-end">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                            {product.isComposite ? 'PREPARADO' : 'REVENDA'}
                                        </span>
                                        <span className="text-lg font-bold text-indigo-700">R$ {product.price.toFixed(2)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DIREITA: Carrinho e Checkout */}
            <div className="w-[400px] flex flex-col bg-slate-50 rounded-[24px] border border-slate-200 overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ShoppingCart className="text-indigo-600" /> Carrinho
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">{cart.length} itens</p>
                    </div>

                    {/* Customer Selector */}
                    <div className="bg-slate-100 rounded-xl p-1 flex items-center gap-2">
                        {selectedCustomer ? (
                            <div className="flex-1 flex justify-between items-center px-3 py-1.5 bg-white rounded-lg shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Cliente</span>
                                    <span className="text-sm font-bold text-slate-800 truncate w-36">{selectedCustomer.name}</span>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCustomerModalOpen(true)}
                                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                            >
                                <UserPlus size={18} /> Adicionar Cliente à Venda
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Wallet size={48} strokeWidth={1} />
                            <p className="mt-2 font-medium">Seu carrinho está vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartId} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex gap-3 animate-in slide-in-from-right-2">
                                {/* No Image in Cart anymore either to match style, or keep if preferred. Removing for consistency since "no product images" was requested */}
                                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-lg">
                                    {item.name.charAt(0)}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm text-slate-800 line-clamp-1">{item.name}</span>
                                        <span className="font-bold text-sm text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                                            <button onClick={() => updateQty(item.cartId, -1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-indigo-600"><Minus size={14} /></button>
                                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.cartId, 1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-indigo-600"><Plus size={14} /></button>
                                        </div>
                                        <button onClick={() => updateQty(item.cartId, -999)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-500 font-medium">Total</span>
                        <span className="text-3xl font-bold text-indigo-700">R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Button
                        className="w-full h-14 text-lg font-bold shadow-indigo-300 shadow-lg"
                        onClick={() => setPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                    >
                        Finalizar Venda <ArrowRight size={20} />
                    </Button>
                </div>
            </div>

            {/* MODAL DE PAGAMENTO */}
            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">

                        {/* Resumo Lateral (Esquerda no Modal) */}
                        <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-100 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo</h3>
                                {selectedCustomer && (
                                    <div className="mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-sm">
                                        <span className="block text-indigo-400 text-xs font-bold uppercase">Cliente</span>
                                        <span className="font-bold text-indigo-900">{selectedCustomer.name}</span>
                                    </div>
                                )}
                                <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between text-sm text-slate-600">
                                            <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                                            <span className="font-medium">{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-200">
                                <span className="block text-slate-500 text-sm">Total a pagar</span>
                                <span className="block text-3xl font-bold text-indigo-700">R$ {cartTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Área de Seleção (Direita no Modal) */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Pagamento</h2>
                                <button onClick={() => { setPaymentModalOpen(false); setSelectedPaymentMethod(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                            </div>

                            {!selectedPaymentMethod ? (
                                <div className="grid grid-cols-2 gap-4 flex-1 content-start">
                                    {[
                                        { id: 'credit', label: 'Crédito', icon: <CreditCard size={32} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                                        { id: 'debit', label: 'Débito', icon: <CreditCard size={32} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                                        { id: 'pix', label: 'PIX', icon: <QrCode size={32} />, color: 'text-teal-600', bg: 'bg-teal-50' },
                                        { id: 'cash', label: 'Dinheiro', icon: <Banknote size={32} />, color: 'text-green-600', bg: 'bg-green-50' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => m.id === 'pix' ? setSelectedPaymentMethod('pix') : handleCheckout(m.id as any)}
                                            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all active:scale-[0.98] ${m.bg}`}
                                        >
                                            <div className={`${m.color}`}>{m.icon}</div>
                                            <span className="font-bold text-slate-700">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // TELA EXCLUSIVA DO PIX
                                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95">
                                    {settings.pixKey ? (
                                        <>
                                            <div className="text-center mb-6">
                                                <h3 className="text-xl font-bold text-slate-800">Escaneie o QR Code</h3>
                                                <p className="text-slate-500 text-sm">Abra o app do seu banco e pague via Pix</p>
                                            </div>

                                            <div className="bg-white p-3 rounded-2xl border-2 border-indigo-100 shadow-inner mb-6 relative group">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatePixPayload(settings.pixKey, settings.storeName || 'Loja', 'Cidade', cartTotal))}`}
                                                    alt="QR Pix"
                                                    className="w-64 h-64 object-contain mix-blend-multiply"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
                                                    <p className="font-bold text-indigo-700">R$ {cartTotal.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            <div className="w-full max-w-sm flex flex-col gap-3">
                                                <Button
                                                    className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-green-200"
                                                    onClick={() => handleCheckout('pix')}
                                                >
                                                    <CheckCircle size={20} /> Pagamento Confirmado
                                                </Button>
                                                <Button variant="text" onClick={() => setSelectedPaymentMethod(null)}>Escolher outra forma</Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-red-500">
                                            <AlertCircle size={48} className="mx-auto mb-2" />
                                            <p>Chave PIX não configurada nas configurações.</p>
                                            <Button variant="text" onClick={() => setSelectedPaymentMethod(null)}>Voltar</Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SELEÇÃO DE CLIENTE */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800">Selecionar Cliente</h3>
                            <button onClick={() => setIsCustomerModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                                onChange={(e) => {
                                    // Api search for suppliers if requested, or filter local state if efficient
                                    const val = e.target.value.toLowerCase();
                                    setCustomers(prev => prev.filter(c => c.name.toLowerCase().includes(val))); // Simple client filter for now until search API for suppliers
                                }}
                            />
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {customers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCustomer(c);
                                        setIsCustomerModalOpen(false);
                                    }}
                                    className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                        {c.type === 'PJ' ? <Building2 size={14} /> : <User size={14} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.document || 'Sem documento'}</p>
                                    </div>
                                </button>
                            ))}
                            {customers.length === 0 && (
                                <p className="text-center text-slate-400 text-sm py-4">Nenhum parceiro encontrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUCESSO */}
            {successModalOpen && (
                <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center text-center w-full max-w-sm animate-in zoom-in-50">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Venda Realizada!</h2>
                        <p className="text-slate-500 mt-2 mb-8">O pedido foi registrado e o estoque atualizado.</p>

                        <div className="w-full space-y-3">
                            <Button variant="tonal" className="w-full h-12" onClick={handlePrint} icon={<Printer />}>Imprimir Cupom</Button>
                            <Button className="w-full h-12" onClick={() => setSuccessModalOpen(false)}>Nova Venda</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Error */}
            {errorMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg font-medium animate-in slide-in-from-bottom-5 z-[70]">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}
