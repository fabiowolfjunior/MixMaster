import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Minus, Plus, CreditCard, Banknote, QrCode, CheckCircle, Trash2, Tag, X, Printer, ArrowRight, ScanBarcode, Wallet, AlertCircle, UserPlus } from 'lucide-react';
import { Product, CartItem, Sale, FinancialSettings, Supplier } from '../types';
import { api } from '../services/api';
// Button component can be replaced or styled with M3 classes, but keeping for compatibility if it accepts className
import { Button } from '../components/ui/Button';

// --- HELPERS ---
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

    payload += '6304';

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
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<Supplier[]>([]);
    const [settings, setSettings] = useState<FinancialSettings>({ fixedCosts: 0 });

    const [activeCategory, setActiveCategory] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Supplier | null>(null);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Sale['paymentMethod'] | null>(null);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        api.suppliers.list().then(setCustomers);
        api.settings.get().then(setSettings);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            api.products.list(searchTerm).then(setProducts);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Barcode scanner auto-add
    useEffect(() => {
        if (searchTerm && products.length > 0) {
            const match = products.find(p => p.barcode === searchTerm);
            if (match) {
                addToCart(match);
                setSearchTerm('');
            }
        }
    }, [searchTerm, products]);

    const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)], [products]);

    const filteredProducts = products.filter(p => {
        const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
        return matchCat;
    });

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // --- CART LOGIC ---
    const calculatePrice = (product: any, quantity: number) => {
        let price = product.price;
        if (product.pricingTiers && product.pricingTiers.length > 0) {
            const tier = product.pricingTiers
                .filter((t: any) => quantity >= t.minQuantity)
                .sort((a: any, b: any) => b.minQuantity - a.minQuantity)[0];
            if (tier) price = tier.unitPrice;
        }
        return price;
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            let newQty = 1;

            if (existing) {
                newQty = existing.quantity + 1;
                const newPrice = calculatePrice(product, newQty);
                return prev.map(i => i.id === product.id ? { ...i, quantity: newQty, price: newPrice } : i);
            }

            const initialPrice = calculatePrice(product, 1);
            return [...prev, { ...product, quantity: 1, price: initialPrice, cartId: crypto.randomUUID() }];
        });
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => {
            const itemIndex = prev.findIndex(i => i.cartId === cartId);
            if (itemIndex === -1) return prev;

            const item = prev[itemIndex];
            const newQty = item.quantity + delta;

            if (newQty <= 0) {
                return prev.filter(i => i.cartId !== cartId);
            }

            const newPrice = calculatePrice(item, newQty); // 'item' has the tiers data if spread correctly?
            // Note: In a real app we might need to find the product again if 'item' lost the tiers data.
            // For now assuming 'item' carries everything. 

            const newCart = [...prev];
            newCart[itemIndex] = { ...item, quantity: newQty, price: newPrice };
            return newCart;
        });
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
                priceAtSale: c.price // Using the tier price
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
        // ... (Keep existing print logic logic - abbreviated for brevity if unchanged, but copying full for safety)
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
                    .font-bold { font-weight: bold; }
                    .text-xl { font-size: 18px; }
                    .mb-1 { margin-bottom: 4px; }
                    .mb-2 { margin-bottom: 8px; }
                    .mt-2 { margin-top: 8px; }
                    .border-b { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .logo { max-width: 120px; max-height: 80px; margin: 0 auto 8px auto; display: block; object-fit: contain; }
                    .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
                    .footer { font-size: 10px; text-align: center; margin-top: 15px; }
                </style>
            </head>
            <body>
                ${settings.logo ? `<div class="text-center"><img src="${settings.logo}" class="logo" /></div>` : ''}
                
                <div class="text-center">
                    <div class="font-bold text-xl mb-1">${settings.company?.legalName || settings.storeName?.toUpperCase() || 'MIXMASTER'}</div>
                    <div style="font-size:10px; margin-top:4px;">${dateStr} ${timeStr}</div>
                </div>

                <div class="border-b"></div>

                <div class="text-center mb-2 font-bold">
                    PEDIDO #${lastSale.id.slice(0, 4).toUpperCase()}
                </div>

                ${lastSale.customerName ? `<div class="mb-2" style="font-size:11px"><strong>CLIENTE:</strong> ${lastSale.customerName.toUpperCase()}</div>` : ''}

                <div class="border-b"></div>

                <div>
                    ${lastSale.items.map(item => `
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
                
                <div class="footer">
                    Obrigado pela preferência!<br/>
                    Volte sempre!<br/>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-2rem)] gap-4 lg:gap-6 overflow-hidden">
            {/* LEFT / CENTER: Products (70%) */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">

                {/* Search Bar Docked Top */}
                <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-outline)]" size={24} />
                        <input
                            className="w-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-full pl-12 pr-12 h-14 text-lg outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)] transition-shadow"
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <ScanBarcode className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--md-sys-color-outline)]" size={24} />
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {categories.map(cat => {
                        const isActive = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`
                                    px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border
                                    ${isActive
                                        ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] border-transparent'
                                        : 'bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'}
                                `}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => {
                            const hasTiers = product.pricingTiers && product.pricingTiers.length > 0;
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="m3-card-elevated flex flex-col justify-between p-0 overflow-hidden group text-left h-48 active:scale-[0.98]"
                                >
                                    {/* Image / Placeholder Area */}
                                    <div className="h-28 w-full bg-[var(--md-sys-color-surface-container-highest)] relative">
                                        {product.image ? (
                                            <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] opacity-20">
                                                <Tag size={40} />
                                            </div>
                                        )}

                                        {hasTiers && (
                                            <span className="absolute top-2 right-2 bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                                ATACADO
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 flex flex-col justify-between flex-1">
                                        <h3 className="font-medium text-[var(--md-sys-color-on-surface)] text-sm leading-tight line-clamp-2">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-end justify-between mt-auto">
                                            <span className="text-[10px] text-[var(--md-sys-color-outline)] uppercase tracking-wider font-bold">
                                                {product.category || 'GERAL'}
                                            </span>
                                            <span className="text-lg font-bold text-[var(--md-sys-color-primary)]">
                                                R$ {product.price.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: Cart (30%) - Fixed Width on Desktop */}
            <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-[var(--md-sys-color-surface-container-low)] rounded-[var(--radius-xl)] overflow-hidden shadow-xl border border-[var(--md-sys-color-outline-variant)]/20">
                {/* Customer Header */}
                <div className="p-5 bg-[var(--md-sys-color-surface)] border-b border-[var(--md-sys-color-outline-variant)]/20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-normal text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                            Carrinho <span className="text-sm text-[var(--md-sys-color-primary)] font-bold bg-[var(--md-sys-color-primary-container)] px-2 py-0.5 rounded-full">{cart.length}</span>
                        </h2>
                    </div>

                    <div className="bg-[var(--md-sys-color-surface-container-high)] rounded-[var(--radius-lg)] p-1 flex items-center">
                        {selectedCustomer ? (
                            <div className="flex-1 flex justify-between items-center px-4 py-2 bg-[var(--md-sys-color-surface)] rounded-[var(--radius-sm)] shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[var(--md-sys-color-outline)] uppercase font-bold tracking-wider">Cliente</span>
                                    <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{selectedCustomer.name}</span>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)] p-1 rounded-full"><X size={18} /></button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCustomerModalOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm text-[var(--md-sys-color-primary)] font-medium hover:bg-[var(--md-sys-color-surface-variant)] rounded-[var(--radius-md)] transition-colors"
                            >
                                <UserPlus size={18} /> Adicionar Cliente à Venda
                            </button>
                        )}
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-[var(--md-sys-color-surface-container-low)]">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--md-sys-color-outline)] opacity-50 gap-4">
                            <ShoppingCart size={64} strokeWidth={1} />
                            <p className="text-lg">Seu carrinho está vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartId} className="flex items-center gap-3 p-3 bg-[var(--md-sys-color-surface)] rounded-[var(--radius-md)] border border-[var(--md-sys-color-outline-variant)]/10 shadow-sm animate-in slide-in-from-right-2">
                                {/* Qty Controls */}
                                <div className="flex flex-col items-center bg-[var(--md-sys-color-surface-container-high)] rounded-lg p-0.5">
                                    <button onClick={() => updateQty(item.cartId, 1)} className="w-8 h-7 flex items-center justify-center text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] rounded-t-lg"><Plus size={14} /></button>
                                    <span className="text-sm font-bold w-full text-center py-0.5 bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)]">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.cartId, -1)} className="w-8 h-7 flex items-center justify-center text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-error)] rounded-b-lg"><Minus size={14} /></button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-sm text-[var(--md-sys-color-on-surface)] line-clamp-2 leading-tight mb-1">{item.name}</p>
                                        <p className="font-bold text-sm text-[var(--md-sys-color-on-surface)] ml-2 whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-[var(--md-sys-color-outline)]">Un: R$ {item.price.toFixed(2)}</span>
                                            {/* Discount badge logic if needed */}
                                        </div>
                                        <button onClick={() => updateQty(item.cartId, -999)} className="text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-error)] p-1"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-6 bg-[var(--md-sys-color-surface)] border-t border-[var(--md-sys-color-outline-variant)]/20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-[var(--md-sys-color-on-surface-variant)] text-lg">Total</span>
                        <span className="text-4xl font-bold text-[var(--md-sys-color-primary)] font-display tracking-tight">R$ {cartTotal.toFixed(2)}</span>
                    </div>

                    <button
                        className="m3-fab-extended w-full flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        onClick={() => setPaymentModalOpen(true)}
                        disabled={cart.length === 0}
                    >
                        <span className="font-bold text-lg">Finalizar Venda</span>
                        <div className="bg-[var(--md-sys-color-on-primary-container)] text-[var(--md-sys-color-primary-container)] p-2 rounded-full transform group-hover:translate-x-1 transition-transform">
                            <ArrowRight size={20} />
                        </div>
                    </button>
                </div>
            </div>

            {/* MODALS using M3 style */}

            {/* PAYMENT */}
            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--md-sys-color-surface-container-high)] rounded-[var(--radius-xl)] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                        {/* Left Summary Pane */}
                        <div className="w-full md:w-1/3 bg-[var(--md-sys-color-surface)] p-6 border-r border-[var(--md-sys-color-outline-variant)] flex flex-col justify-between">
                            <div>
                                <h3 className="text-headline-medium text-lg mb-4 text-[var(--md-sys-color-on-surface)]">Resumo do Pedido</h3>
                                {selectedCustomer && (
                                    <div className="mb-4 bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] p-3 rounded-lg text-sm font-bold">
                                        {selectedCustomer.name}
                                    </div>
                                )}
                                <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="flex justify-between text-sm text-[var(--md-sys-color-on-surface-variant)] py-1 border-b border-[var(--md-sys-color-outline-variant)]/20">
                                            <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                                            <span className="font-medium">{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
                                <span className="block text-[var(--md-sys-color-on-surface-variant)] text-sm">Total a pagar</span>
                                <span className="block text-3xl font-bold text-[var(--md-sys-color-primary)]">R$ {cartTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Right Payment Options */}
                        <div className="flex-1 p-8 flex flex-col justify-between bg-[var(--md-sys-color-surface-container-low)]">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-normal text-[var(--md-sys-color-on-surface)]">Como deseja pagar?</h2>
                                <button onClick={() => { setPaymentModalOpen(false); setSelectedPaymentMethod(null); }} className="p-2 hover:bg-[var(--md-sys-color-surface-variant)] rounded-full text-[var(--md-sys-color-on-surface-variant)]"><X size={24} /></button>
                            </div>

                            {!selectedPaymentMethod ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'credit', label: 'Crédito', icon: <CreditCard size={32} />, color: 'var(--md-sys-color-primary)' },
                                        { id: 'debit', label: 'Débito', icon: <CreditCard size={32} />, color: 'var(--md-sys-color-secondary)' },
                                        { id: 'pix', label: 'PIX', icon: <QrCode size={32} />, color: 'var(--md-sys-color-tertiary)' },
                                        { id: 'cash', label: 'Dinheiro', icon: <Banknote size={32} />, color: 'var(--md-sys-color-error)' }, // Using error color for cash is common for "high attention"
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => m.id === 'pix' ? setSelectedPaymentMethod('pix') : handleCheckout(m.id as any)}
                                            className="m3-card-elevated h-32 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-[var(--md-sys-color-primary)]"
                                        >
                                            <div style={{ color: m.color }}>{m.icon}</div>
                                            <span className="font-bold text-[var(--md-sys-color-on-surface)]">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95">
                                    {settings.pixKey ? (
                                        <>
                                            <h3 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] mb-6">Escaneie o QR Code</h3>
                                            <div className="p-4 bg-white rounded-xl shadow-sm mb-6">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatePixPayload(settings.pixKey, settings.storeName || 'Loja', 'Cidade', cartTotal))}`}
                                                    alt="QR Pix"
                                                    className="w-48 h-48 object-contain mix-blend-multiply"
                                                />
                                            </div>
                                            <button className="m3-btn-filled w-full flex items-center justify-center gap-2" onClick={() => handleCheckout('pix')}>
                                                <CheckCircle size={20} />
                                                Confirmar Pagamento
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center text-[var(--md-sys-color-error)]">
                                            <AlertCircle size={48} className="mx-auto mb-2" />
                                            <p>Chave PIX não configurada.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOMER MODAL */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-[var(--md-sys-color-surface)] rounded-[var(--radius-lg)] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[var(--md-sys-color-on-surface)]">Selecionar Cliente</h3>
                            <button onClick={() => setIsCustomerModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {customers.map(c => (
                                <button key={c.id} onClick={() => { setSelectedCustomer(c); setIsCustomerModalOpen(false); }} className="w-full text-left p-4 rounded-lg hover:bg-[var(--md-sys-color-surface-container)] transition-colors border-b border-[var(--md-sys-color-outline-variant)]/20 last:border-0">
                                    <p className="font-bold text-[var(--md-sys-color-on-surface)]">{c.name}</p>
                                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{c.document || 'Sem documento'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL */}
            {successModalOpen && (
                <div className="fixed inset-0 bg-[var(--md-sys-color-scrim)]/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-[var(--md-sys-color-surface-container-high)] p-8 rounded-[var(--radius-xl)] shadow-2xl flex flex-col items-center text-center w-full max-w-sm animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full flex items-center justify-center mb-6 shadow-lg">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--md-sys-color-on-surface)] mb-2">Venda Realizada!</h2>
                        <p className="text-[var(--md-sys-color-on-surface-variant)] mb-8">O pedido foi registrado com sucesso.</p>

                        <div className="w-full space-y-3">
                            <button className="m3-btn-tonal w-full flex justify-center items-center gap-2" onClick={handlePrint}>
                                <Printer size={18} /> Imprimir Cupom
                            </button>
                            <button className="m3-btn-filled w-full" onClick={() => setSuccessModalOpen(false)}>
                                Nova Venda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
