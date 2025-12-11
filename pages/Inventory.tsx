
import React, { useState, useEffect } from 'react';
import { Plus, Package, Search, Trash2, Edit2, Info, ScanBarcode, Calculator, XCircle } from 'lucide-react';
import { Ingredient, Product, UnitType, RecipeItem, Supplier } from '../types';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function Inventory() {
    const [activeTab, setActiveTab] = useState<'ingredients' | 'products'>('ingredients');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // Modals
    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [isProdModalOpen, setIsProdModalOpen] = useState(false);

    // Forms
    const [searchTerm, setSearchTerm] = useState('');
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({ unit: UnitType.UN });
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        isComposite: false,
        recipe: [],
        resaleQuantity: 1
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ings, prods, sups] = await Promise.all([
                api.ingredients.list(),
                api.products.list(),
                api.suppliers.list()
            ]);
            setIngredients(ings);
            setProducts(prods);
            setSuppliers(sups);
        } catch (e) {
            console.error("Error fetching inventory", e);
        }
    };

    // --- HANDLERS INGREDIENTS ---

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIngredient.name || !newIngredient.costPerPackage) return;

        // Calc cost per unit
        const costPerUnit = newIngredient.volumePerPackage && newIngredient.volumePerPackage > 0
            ? newIngredient.costPerPackage / newIngredient.volumePerPackage
            : 0;

        const ingData = {
            ...newIngredient,
            volumePerPackage: Number(newIngredient.volumePerPackage || 1),
            costPerPackage: Number(newIngredient.costPerPackage),
            currentStock: Number(newIngredient.currentStock || 0),
            minStock: Number(newIngredient.minStock || 0),
            costPerUnit
        };

        await api.ingredients.create(ingData);
        setIsIngModalOpen(false);
        setNewIngredient({ unit: UnitType.UN });
        fetchData();
    };

    const handleDeleteIngredient = (id: string) => {
        if (confirm('Tem certeza? (Funcionalidade de delete ainda não implementada na API)')) {
            // Placeholder: API Delete endpoint needed
            console.warn("Delete not implemented in API server yet");
        }
    };

    // --- HANDLERS PRODUCTS ---

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.price) return;

        // For Prisma logic, we send recipeItems differently or as is
        // Our server expects { ...data, recipeItems: [] }

        // Transform recipe to match server expectation if needed
        // Current frontend 'recipe' is array of { ingredientId, quantity }
        // Server expects recipeItems: { create: [...] }

        const serverPayload = {
            name: newProduct.name,
            barcode: newProduct.barcode,
            category: newProduct.category || 'Geral',
            price: Number(newProduct.price),
            isComposite: newProduct.isComposite || false,
            resaleIngredientId: newProduct.resaleIngredientId,
            resaleQuantity: newProduct.isComposite ? null : Number(newProduct.resaleQuantity || 1),
            recipeItems: newProduct.isComposite ? newProduct.recipe?.map(r => ({
                ingredientId: r.ingredientId,
                quantity: r.quantity
            })) : []
        };

        await api.products.create(serverPayload);
        setIsProdModalOpen(false);
        setNewProduct({ isComposite: false, recipe: [], resaleQuantity: 1 });
        fetchData();
    };

    const handleDeleteProduct = (id: string) => {
        if (confirm('Remover este produto? (Funcionalidade de delete ainda não implementada na API)')) {
            console.warn("Delete not implemented");
        }
    };

    const addRecipeItem = () => {
        setNewProduct({
            ...newProduct,
            recipe: [...(newProduct.recipe || []), { ingredientId: '', quantity: 0 }]
        });
    };

    const updateRecipeItem = (index: number, field: keyof RecipeItem, value: any) => {
        const newRecipe = [...(newProduct.recipe || [])];
        newRecipe[index] = { ...newRecipe[index], [field]: value };
        setNewProduct({ ...newProduct, recipe: newRecipe });
    };

    const removeRecipeItem = (index: number) => {
        const newRecipe = [...(newProduct.recipe || [])];
        newRecipe.splice(index, 1);
        setNewProduct({ ...newProduct, recipe: newRecipe });
    };

    // --- CALCULATIONS ---

    const calculateCost = (prod: Partial<Product>) => {
        if (prod.isComposite) {
            return (prod.recipe || []).reduce((acc, item) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                return acc + (ing ? ing.costPerUnit * item.quantity : 0);
            }, 0);
        } else if (prod.resaleIngredientId) {
            const ing = ingredients.find(i => i.id === prod.resaleIngredientId);
            return ing ? ing.costPerUnit * (prod.resaleQuantity || 1) : 0;
        }
        return 0;
    };

    const estimatedCost = calculateCost(newProduct);
    const profitMargin = newProduct.price ? ((newProduct.price - estimatedCost) / newProduct.price) * 100 : 0;

    // --- UI HELPERS ---

    const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5";
    const labelClass = "block mb-1 text-xs font-bold text-slate-500 uppercase";

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Package className="text-indigo-600" /> Gestão de Estoque
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie insumos, fichas técnicas e produtos finais.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="tonal" icon={<Package size={18} />} onClick={() => { setNewIngredient({ unit: UnitType.UN }); setIsIngModalOpen(true); }}>Novo Insumo</Button>
                    <Button variant="filled" icon={<Plus size={18} />} onClick={() => { setNewProduct({ isComposite: false, recipe: [], resaleQuantity: 1 }); setIsProdModalOpen(true); }}>Novo Produto</Button>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ingredients' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Insumos ({ingredients.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Produtos ({products.length})
                    </button>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* CONTENT */}
            {activeTab === 'ingredients' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredIngredients.map(ing => (
                        <Card key={ing.id} className={`p-4 border-l-4 ${ing.currentStock < ing.minStock ? 'border-l-red-500 bg-red-50/30' : 'border-l-indigo-500'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-800">{ing.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">{ing.supplier || 'Fornecedor n/d'}</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Edit disabled for MVP migration until PUT endpoint ready, or re-open modal pre-filled but save creates new? Disabled for safety */}
                                    <button onClick={() => { /* setNewIngredient(ing); setIsIngModalOpen(true); */ alert("Edição em breve"); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteIngredient(ing.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 bg-white p-3 rounded-xl border border-slate-100">
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Estoque Atual</span>
                                    <span className={`text-lg font-bold ${ing.currentStock < ing.minStock ? 'text-red-600' : 'text-slate-800'}`}>
                                        {ing.currentStock.toFixed(1)} <span className="text-xs text-slate-400">{ing.unit}</span>
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Custo Unit.</span>
                                    <span className="text-lg font-bold text-slate-800">
                                        R$ {ing.costPerUnit.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {filteredIngredients.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Nenhum insumo encontrado.</div>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map(prod => {
                        const prodCost = calculateCost(prod);
                        const margin = prod.price > 0 ? ((prod.price - prodCost) / prod.price) * 100 : 0;
                        return (
                            <Card key={prod.id} className="p-4 border-l-4 border-l-emerald-500">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-800">{prod.name}</h3>
                                        <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                                            {prod.isComposite ? <Info size={12} /> : <Package size={12} />}
                                            {prod.isComposite ? 'Ficha Técnica' : `Revenda (${prod.resaleQuantity || 1} un)`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { /* setNewProduct(prod); setIsProdModalOpen(true); */ alert("Edição em breve"); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteProduct(prod.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-4 bg-white p-3 rounded-xl border border-slate-100">
                                    <div>
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Preço</span>
                                        <span className="text-sm font-bold text-emerald-600">R$ {prod.price.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Custo</span>
                                        <span className="text-sm font-bold text-slate-600">R$ {prodCost.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Margem</span>
                                        <span className={`text-sm font-bold ${margin < 30 ? 'text-red-500' : 'text-indigo-600'}`}>{margin.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {filteredProducts.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Nenhum produto cadastrado.</div>}
                </div>
            )}

            {/* MODAL INSUMO */}
            {isIngModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] w-full max-w-lg p-6 animate-in zoom-in-95 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">{newIngredient.id ? 'Editar Insumo' : 'Novo Insumo'}</h2>
                        <form onSubmit={handleSaveIngredient} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={labelClass}>Nome do Insumo</label>
                                    <input className={inputClass} value={newIngredient.name || ''} onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })} autoFocus required placeholder="Ex: Vodka Absolut 1L" />
                                </div>
                                <div>
                                    <label className={labelClass}>Fornecedor</label>
                                    <select
                                        className={inputClass}
                                        value={newIngredient.supplierId || ''}
                                        onChange={e => {
                                            const sup = suppliers.find(s => s.id === e.target.value);
                                            setNewIngredient({ ...newIngredient, supplierId: e.target.value, supplier: sup?.name || '' });
                                        }}
                                    >
                                        <option value="">Selecione...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Cód. Barras</label>
                                    <div className="relative">
                                        <input className={`${inputClass} pl-8`} value={newIngredient.barcode || ''} onChange={e => setNewIngredient({ ...newIngredient, barcode: e.target.value })} />
                                        <ScanBarcode size={16} className="absolute left-2.5 top-3 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Preço do Pacote (R$)</label>
                                    <input type="number" step="0.01" className={inputClass} value={newIngredient.costPerPackage || ''} onChange={e => setNewIngredient({ ...newIngredient, costPerPackage: parseFloat(e.target.value) })} placeholder="0.00" required />
                                </div>
                                <div>
                                    <label className={labelClass}>Volume Total / Qtd</label>
                                    <input type="number" className={inputClass} value={newIngredient.volumePerPackage || ''} onChange={e => setNewIngredient({ ...newIngredient, volumePerPackage: parseFloat(e.target.value) })} placeholder="Ex: 1000 (para ml)" required />
                                </div>
                                <div>
                                    <label className={labelClass}>Unidade de Medida</label>
                                    <select className={inputClass} value={newIngredient.unit} onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value as UnitType })}>
                                        <option value={UnitType.ML}>Mililitros (ml)</option>
                                        <option value={UnitType.L}>Litros (l)</option>
                                        <option value={UnitType.UN}>Unidade (un)</option>
                                        <option value={UnitType.KG}>Quilos (kg)</option>
                                        <option value={UnitType.G}>Gramas (g)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Custo Unitário (Calc.)</label>
                                    <div className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-lg font-bold text-sm">
                                        R$ {((newIngredient.costPerPackage || 0) / (newIngredient.volumePerPackage || 1)).toFixed(4)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Estoque Atual</label>
                                    <input type="number" className={inputClass} value={newIngredient.currentStock || ''} onChange={e => setNewIngredient({ ...newIngredient, currentStock: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Estoque Mínimo</label>
                                    <input type="number" className={inputClass} value={newIngredient.minStock || ''} onChange={e => setNewIngredient({ ...newIngredient, minStock: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button variant="text" type="button" onClick={() => setIsIngModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Salvar Insumo</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PRODUTO */}
            {isProdModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-[28px]">
                            <h2 className="text-xl font-bold text-slate-900">{newProduct.id ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <p className="text-xs text-slate-500 mt-1">Configure o preço de venda e a composição de custo.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Nome do Produto (Cardápio)</label>
                                    <input className={inputClass} value={newProduct.name || ''} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} autoFocus required placeholder="Ex: Gin Tônica Clássica" />
                                </div>
                                <div>
                                    <label className={labelClass}>Categoria</label>
                                    <input className={inputClass} value={newProduct.category || ''} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Ex: Drinks, Cervejas" />
                                </div>
                                <div>
                                    <label className={labelClass}>Preço de Venda (R$)</label>
                                    <input type="number" step="0.01" className={`${inputClass} font-bold text-indigo-700`} value={newProduct.price || ''} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Cód. Barras (Opcional)</label>
                                    <div className="relative">
                                        <input className={`${inputClass} pl-8`} value={newProduct.barcode || ''} onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })} />
                                        <ScanBarcode size={16} className="absolute left-2.5 top-3 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            {/* MODE SWITCHER */}
                            <div className="bg-slate-100 p-1 rounded-xl flex">
                                <button
                                    type="button"
                                    onClick={() => setNewProduct({ ...newProduct, isComposite: false })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!newProduct.isComposite ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Revenda Direta (Simples)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewProduct({ ...newProduct, isComposite: true })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newProduct.isComposite ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Ficha Técnica (Composto)
                                </button>
                            </div>

                            {/* REVENDA LOGIC */}
                            {!newProduct.isComposite && (
                                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4">
                                    <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Package size={16} /> Configuração de Estoque</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Insumo para Baixa</label>
                                            <select
                                                className={inputClass}
                                                value={newProduct.resaleIngredientId || ''}
                                                onChange={e => setNewProduct({ ...newProduct, resaleIngredientId: e.target.value })}
                                            >
                                                <option value="">Selecione o item do estoque...</option>
                                                {ingredients.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Quantidade de Baixa</label>
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={newProduct.resaleQuantity || 1}
                                                onChange={e => setNewProduct({ ...newProduct, resaleQuantity: parseFloat(e.target.value) })}
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Quantas unidades serão descontadas do estoque a cada venda?
                                                (Ex: Se vender um Fardo de 12 latas, coloque 12 aqui).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* COMPOSITE LOGIC */}
                            {newProduct.isComposite && (
                                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Calculator size={16} /> Composição (Receita)</h3>
                                        <Button variant="text" type="button" onClick={addRecipeItem} className="h-8 text-xs">+ Ingrediente</Button>
                                    </div>

                                    {newProduct.recipe?.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                className={`${inputClass} flex-1`}
                                                value={item.ingredientId}
                                                onChange={e => updateRecipeItem(idx, 'ingredientId', e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                            </select>
                                            <div className="relative w-24">
                                                <input
                                                    type="number"
                                                    className={`${inputClass} pr-8`}
                                                    placeholder="Qtd"
                                                    value={item.quantity}
                                                    onChange={e => updateRecipeItem(idx, 'quantity', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeRecipeItem(idx)} className="p-2 text-red-400 hover:bg-red-50 rounded-full"><XCircle size={18} /></button>
                                        </div>
                                    ))}
                                    {(!newProduct.recipe || newProduct.recipe.length === 0) && (
                                        <p className="text-center text-sm text-indigo-300 py-2 italic">Nenhum ingrediente adicionado.</p>
                                    )}
                                </div>
                            )}

                            {/* FINANCE SUMMARY */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                                <div>
                                    <span className="block text-xs text-slate-500 font-bold uppercase">Custo Estimado (CMV)</span>
                                    <span className="text-lg font-bold text-slate-700">R$ {estimatedCost.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-slate-500 font-bold uppercase">Margem de Lucro</span>
                                    <span className={`text-lg font-bold ${profitMargin < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {profitMargin.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-[28px]">
                            <Button variant="outlined" type="button" onClick={() => setIsProdModalOpen(false)}>Cancelar</Button>
                            <Button type="button" onClick={(e) => handleSaveProduct(e as any)}>Salvar Produto</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
