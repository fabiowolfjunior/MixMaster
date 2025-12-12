import React, { useState, useEffect } from 'react';
import {
    Plus, Package, Search, Trash2, Edit2, Info,
    ScanBarcode, Calculator, X, ChevronDown, Check,
    AlertTriangle, Calendar, Filter, Boxes, ArrowRightLeft
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';

// --- Types ---
interface Ingredient {
    id: string;
    name: string;
    unit: string; // 'UN', 'KG', 'L', 'CX', 'FD'
    costPerPackage: number;
    volumePerPackage: number;
    currentStock: number;
    minStock: number;
    costPerUnit: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    category?: string;
    barcode?: string;
    image?: string;
    isComposite: boolean;
    resaleIngredientId?: string;
    // Relationships
    batches?: any[];
    pricingTiers?: any[];
    recipeItems?: any[];
}

export default function Inventory() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'products' | 'ingredients'>('products');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Data
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

    // Form State
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({ isComposite: false });
    const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient>>({ unit: 'UN' });
    const [editingBatch, setEditingBatch] = useState<any>({});

    // Product Modal Tabs
    const [productTab, setProductTab] = useState<'basic' | 'recipe' | 'pricing' | 'stock'>('basic');

    // --- Effects ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prods, ings] = await Promise.all([
                api.products.list(),
                api.ingredients.list()
            ]);
            setProducts(prods);
            setIngredients(ings);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar dados do estoque", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers: Product ---
    const handleOpenProduct = (product?: Product) => {
        if (product) {
            setEditingProduct({ ...product });
        } else {
            setEditingProduct({
                isComposite: false,
                pricingTiers: [],
                recipeItems: [],
                batches: []
            });
        }
        setProductTab('basic');
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct.name || !editingProduct.price) {
            showToast("Nome e Preço são obrigatórios", "error");
            return;
        }

        try {
            const payload = {
                ...editingProduct,
                price: Number(editingProduct.price),
                recipeItems: editingProduct.recipeItems || [],
                pricingTiers: editingProduct.pricingTiers || []
            };

            if (editingProduct.id) {
                await api.products.update(editingProduct.id, payload);
                showToast("Produto atualizado com sucesso", "success");
            } else {
                await api.products.create(payload);
                showToast("Produto criado com sucesso", "success");
            }
            setIsProductModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar produto", "error");
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
        try {
            await api.products.delete(id); // Ensure API supports this or add fallback
            showToast("Produto removido", "success");
            loadData();
        } catch (error) {
            showToast("Erro ao remover produto", "error");
        }
    };

    // --- Handlers: Ingredient ---
    const handleOpenIngredient = (ing?: Ingredient) => {
        if (ing) {
            setEditingIngredient({ ...ing });
        } else {
            setEditingIngredient({ unit: 'UN' });
        }
        setIsIngredientModalOpen(true);
    };

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const cost = Number(editingIngredient.costPerPackage) || 0;
            const vol = Number(editingIngredient.volumePerPackage) || 1;

            const payload = {
                ...editingIngredient,
                costPerPackage: cost,
                volumePerPackage: vol,
                currentStock: Number(editingIngredient.currentStock) || 0,
                costPerUnit: cost / vol
            };

            if (editingIngredient.id) {
                // await api.ingredients.update(editingIngredient.id, payload);
                showToast("Edição de insumo não implementada (MVP)", "info");
            } else {
                await api.ingredients.create(payload);
                showToast("Insumo criado", "success");
            }
            setIsIngredientModalOpen(false);
            loadData();
        } catch (error) {
            showToast("Erro ao salvar insumo", "error");
        }
    };

    const handleDeleteIngredient = async (id: string) => {
        if (!window.confirm("Excluir este insumo?")) return;
        try {
            await api.ingredients.delete(id);
            showToast("Insumo excluído", "success");
            loadData();
        } catch (error) {
            showToast("Erro ao excluir insumo", "error");
        }
    };

    // --- Recipe Logic ---
    const addRecipeItem = () => {
        const items = editingProduct.recipeItems || [];
        setEditingProduct({ ...editingProduct, recipeItems: [...items, { ingredientId: '', quantity: 0 }] });
    };

    const updateRecipeItem = (idx: number, field: string, value: any) => {
        const items = [...(editingProduct.recipeItems || [])];
        items[idx] = { ...items[idx], [field]: value };
        setEditingProduct({ ...editingProduct, recipeItems: items });
    };

    const removeRecipeItem = (idx: number) => {
        const items = [...(editingProduct.recipeItems || [])];
        items.splice(idx, 1);
        setEditingProduct({ ...editingProduct, recipeItems: items });
    };

    // --- Helpers ---
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // --- Render ---
    return (
        <div className="h-full flex flex-col fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--md-sys-color-on-surface)]">Estoque</h1>
                    <p className="text-[var(--md-sys-color-on-surface-variant)]">Gerencie produtos, fichas técnicas e insumos</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-10 pr-4 py-2 rounded-full border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)] outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-[var(--md-sys-color-outline-variant)]">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2
                        ${activeTab === 'products' ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-black/5'}
                    `}
                >
                    <Package size={18} /> Produtos
                </button>
                <button
                    onClick={() => setActiveTab('ingredients')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2
                        ${activeTab === 'ingredients' ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)]' : 'border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-black/5'}
                    `}
                >
                    <Boxes size={18} /> Insumos
                </button>

                <div className="ml-auto pb-2">
                    <Button icon={<Plus size={18} />} onClick={() => activeTab === 'products' ? handleOpenProduct() : handleOpenIngredient()}>
                        {activeTab === 'products' ? 'Novo Produto' : 'Novo Insumo'}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                ) : (
                    <>
                        {/* Products List */}
                        {activeTab === 'products' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="bg-[var(--md-sys-color-surface-container-low)] p-4 rounded-[16px] border border-[var(--md-sys-color-outline-variant)] hover:shadow-md transition-all group">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 rounded-lg bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center shrink-0">
                                                {product.image ? <img src={product.image} className="w-full h-full object-cover rounded-lg" /> : <Package className="text-[var(--md-sys-color-primary)]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[var(--md-sys-color-on-surface)] truncate">{product.name}</h3>
                                                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
                                                    {product.category || 'Sem categoria'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="font-bold text-[var(--md-sys-color-primary)]">
                                                        R$ {product.price.toFixed(2)}
                                                    </span>
                                                    {product.isComposite && (
                                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">Composto</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenProduct(product)} className="p-2 hover:bg-[var(--md-sys-color-surface-variant)] rounded-full text-[var(--md-sys-color-primary)]">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 hover:bg-red-50 rounded-full text-red-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ingredients List */}
                        {activeTab === 'ingredients' && (
                            <div className="bg-[var(--md-sys-color-surface)] rounded-xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)] uppercase text-xs font-bold">
                                        <tr>
                                            <th className="p-4">Nome</th>
                                            <th className="p-4">Unidade</th>
                                            <th className="p-4">Custo/Emb.</th>
                                            <th className="p-4">Estoque</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]">
                                        {filteredIngredients.map(ing => (
                                            <tr key={ing.id} className="hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors">
                                                <td className="p-4 font-medium">{ing.name}</td>
                                                <td className="p-4 text-[var(--md-sys-color-on-surface-variant)]">{ing.unit} ({ing.volumePerPackage})</td>
                                                <td className="p-4">R$ {ing.costPerPackage.toFixed(2)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                        ${ing.currentStock <= ing.minStock
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'}`}>
                                                        {ing.currentStock.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => handleDeleteIngredient(ing.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-full">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- Modals --- */}

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--md-sys-color-surface)] w-full max-w-4xl max-h-[90vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--md-sys-color-outline-variant)] flex justify-between items-center bg-[var(--md-sys-color-surface-container)]">
                            <h2 className="text-xl font-bold">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-black/10 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="flex border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]">
                            {['basic', 'recipe', 'pricing', 'stock'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setProductTab(tab as any)}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all capitalize
                                        ${productTab === tab
                                            ? 'border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-low)]'
                                            : 'border-transparent text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)]'}
                                    `}
                                >
                                    {tab === 'basic' && 'Dados Básicos'}
                                    {tab === 'recipe' && 'Ficha Técnica'}
                                    {tab === 'pricing' && 'Preços'}
                                    {tab === 'stock' && 'Estoque'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[var(--md-sys-color-surface-container-low)]">
                            {/* Basic Tab */}
                            {productTab === 'basic' && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Nome do Produto</label>
                                            <input
                                                className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                                value={editingProduct.name || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Preço Venda</label>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                                value={editingProduct.price || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Categoria</label>
                                            <input
                                                className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                                list="categories"
                                                value={editingProduct.category || ''}
                                                onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                            />
                                            <datalist id="categories">
                                                <option value="Bebidas" />
                                                <option value="Alimentos" />
                                                <option value="Serviços" />
                                            </datalist>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-3 p-4 bg-[var(--md-sys-color-surface)] rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                                            <input
                                                type="checkbox"
                                                id="isComposite"
                                                className="w-5 h-5 accent-[var(--md-sys-color-primary)]"
                                                checked={editingProduct.isComposite}
                                                onChange={e => setEditingProduct({ ...editingProduct, isComposite: e.target.checked })}
                                            />
                                            <label htmlFor="isComposite" className="cursor-pointer select-none">
                                                <span className="font-bold block">Produto Composto / Produzido</span>
                                                <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Marque se este produto é feito de outros ingredientes (Ex: Drink, Lanche)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recipe Tab */}
                            {productTab === 'recipe' && (
                                <div className="max-w-2xl mx-auto">
                                    {!editingProduct.isComposite ? (
                                        <div className="text-center py-10 opacity-50">
                                            <Calculator size={48} className="mx-auto mb-2" />
                                            <p>Habilite "Produto Composto" na aba Dados Básicos para configurar a receita.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold">Ingredientes da Receita</h3>
                                                <Button size="sm" variant="tonal" onClick={addRecipeItem}>+ Adicionar</Button>
                                            </div>
                                            {(editingProduct.recipeItems || []).map((item, idx) => (
                                                <div key={idx} className="flex gap-2 items-center bg-[var(--md-sys-color-surface)] p-2 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                                                    <select
                                                        className="flex-1 bg-transparent p-2 outline-none"
                                                        value={item.ingredientId}
                                                        onChange={e => updateRecipeItem(idx, 'ingredientId', e.target.value)}
                                                    >
                                                        <option value="">Selecione o insumo...</option>
                                                        {ingredients.map(ing => (
                                                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number" placeholder="Qtd"
                                                        className="w-24 bg-[var(--md-sys-color-surface-container-highest)] p-2 rounded"
                                                        value={item.quantity}
                                                        onChange={e => updateRecipeItem(idx, 'quantity', parseFloat(e.target.value))}
                                                    />
                                                    <button onClick={() => removeRecipeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pricing Tab */}
                            {productTab === 'pricing' && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold">Preços por Tabela</h3>
                                        <Button size="sm" variant="tonal" onClick={() => {
                                            const tiers = editingProduct.pricingTiers || [];
                                            setEditingProduct({ ...editingProduct, pricingTiers: [...tiers, { name: '', price: 0, minQuantity: 1 }] });
                                        }}>+ Adicionar Tabela</Button>
                                    </div>

                                    {(editingProduct.pricingTiers || []).map((tier, idx) => (
                                        <div key={idx} className="flex gap-2 items-end bg-[var(--md-sys-color-surface)] p-3 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Nome da Tabela</label>
                                                <input
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    placeholder="Ex: Atacado, VIP"
                                                    value={tier.name}
                                                    onChange={e => {
                                                        const tiers = [...(editingProduct.pricingTiers || [])];
                                                        tiers[idx] = { ...tiers[idx], name: e.target.value };
                                                        setEditingProduct({ ...editingProduct, pricingTiers: tiers });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Preço</label>
                                                <input
                                                    type="number" step="0.01"
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    value={tier.price}
                                                    onChange={e => {
                                                        const tiers = [...(editingProduct.pricingTiers || [])];
                                                        tiers[idx] = { ...tiers[idx], price: parseFloat(e.target.value) };
                                                        setEditingProduct({ ...editingProduct, pricingTiers: tiers });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Qtd Min</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    value={tier.minQuantity}
                                                    onChange={e => {
                                                        const tiers = [...(editingProduct.pricingTiers || [])];
                                                        tiers[idx] = { ...tiers[idx], minQuantity: parseInt(e.target.value) };
                                                        setEditingProduct({ ...editingProduct, pricingTiers: tiers });
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const tiers = [...(editingProduct.pricingTiers || [])];
                                                    tiers.splice(idx, 1);
                                                    setEditingProduct({ ...editingProduct, pricingTiers: tiers });
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-full mb-0.5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(editingProduct.pricingTiers || []).length === 0 && (
                                        <p className="text-center text-sm text-[var(--md-sys-color-on-surface-variant)] py-4">Nenhuma tabela de preço adicional configurada.</p>
                                    )}
                                </div>
                            )}

                            {/* Stock Tab (Batches) */}
                            {productTab === 'stock' && (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold">Lotes e Validade</h3>
                                        <Button size="sm" variant="tonal" onClick={() => {
                                            const batches = editingProduct.batches || [];
                                            setEditingProduct({ ...editingProduct, batches: [...batches, { batchNumber: '', expirationDate: '', initialStock: 0, currentStock: 0 }] });
                                        }}>+ Adicionar Lote</Button>
                                    </div>

                                    {(editingProduct.batches || []).map((batch, idx) => (
                                        <div key={idx} className="flex flex-wrap gap-2 items-end bg-[var(--md-sys-color-surface)] p-3 rounded-lg border border-[var(--md-sys-color-outline-variant)]">
                                            <div className="flex-1 min-w-[120px]">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Nº Lote</label>
                                                <input
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    value={batch.batchNumber || ''}
                                                    onChange={e => {
                                                        const batches = [...(editingProduct.batches || [])];
                                                        batches[idx] = { ...batches[idx], batchNumber: e.target.value };
                                                        setEditingProduct({ ...editingProduct, batches });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Validade</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    value={batch.expirationDate ? new Date(batch.expirationDate).toISOString().split('T')[0] : ''}
                                                    onChange={e => {
                                                        const batches = [...(editingProduct.batches || [])];
                                                        batches[idx] = { ...batches[idx], expirationDate: new Date(e.target.value) };
                                                        setEditingProduct({ ...editingProduct, batches });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] font-bold uppercase text-[var(--md-sys-color-on-surface-variant)]">Qtd</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-b border-[var(--md-sys-color-outline)] p-1 outline-none text-sm"
                                                    value={batch.currentStock || 0}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        const batches = [...(editingProduct.batches || [])];
                                                        batches[idx] = { ...batches[idx], currentStock: val, initialStock: val }; // Simplifying: init = current for new batches
                                                        setEditingProduct({ ...editingProduct, batches });
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const batches = [...(editingProduct.batches || [])];
                                                    batches.splice(idx, 1);
                                                    setEditingProduct({ ...editingProduct, batches });
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-full mb-0.5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(editingProduct.batches || []).length === 0 && (
                                        <p className="text-center text-sm text-[var(--md-sys-color-on-surface-variant)] py-4">Nenhum lote registrado.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] flex justify-end gap-3 rounded-b-[24px]">
                            <Button variant="text" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                            <Button onClick={(e) => handleSaveProduct(e as any)}>Salvar Produto</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingredient Modal */}
            {isIngredientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--md-sys-color-surface)] w-full max-w-md rounded-[24px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--md-sys-color-outline-variant)] flex justify-between items-center">
                            <h2 className="text-xl font-bold">Novo Insumo</h2>
                            <button onClick={() => setIsIngredientModalOpen(false)} className="p-2 hover:bg-black/10 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveIngredient} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Nome do Insumo</label>
                                <input
                                    required
                                    className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                    value={editingIngredient.name || ''}
                                    onChange={e => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Unidade</label>
                                    <select
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                        value={editingIngredient.unit}
                                        onChange={e => setEditingIngredient({ ...editingIngredient, unit: e.target.value })}
                                    >
                                        <option value="UN">Unidade (UN)</option>
                                        <option value="KG">Quilo (KG)</option>
                                        <option value="L">Litro (L)</option>
                                        <option value="CX">Caixa (CX)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Custo Embalagem</label>
                                    <input
                                        type="number" step="0.01"
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                        value={editingIngredient.costPerPackage || ''}
                                        onChange={e => setEditingIngredient({ ...editingIngredient, costPerPackage: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Vol. Embalagem</label>
                                    <input
                                        type="number" step="0.001"
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                        value={editingIngredient.volumePerPackage || ''}
                                        onChange={e => setEditingIngredient({ ...editingIngredient, volumePerPackage: parseFloat(e.target.value) })}
                                        placeholder="Ex: 1 ou 0.350"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase">Estoque Atual</label>
                                    <input
                                        type="number" step="0.001"
                                        className="w-full p-3 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] border-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                                        value={editingIngredient.currentStock || ''}
                                        onChange={e => setEditingIngredient({ ...editingIngredient, currentStock: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button variant="text" type="button" onClick={() => setIsIngredientModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Salvar Insumo</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
