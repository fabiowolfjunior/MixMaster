
export enum UnitType {
  ML = 'ml',
  L = 'l',
  G = 'g',
  KG = 'kg',
  UN = 'un'
}

export interface Ingredient {
  id: string;
  name: string;
  barcode?: string;
  supplier: string; // Keep for legacy, but UI will prefer Supplier ID link
  supplierId?: string; 
  costPerPackage: number;
  volumePerPackage: number;
  unit: UnitType;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  price: number;
  isComposite: boolean;
  recipe: RecipeItem[];
  resaleIngredientId?: string;
  resaleQuantity?: number; // Quantidade a baixar do estoque (ex: 8 para fardo, 350 para lata ml)
  imageUrl?: string;
}

export interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

export interface FiscalData {
  accessKey: string; // Chave de acesso 44 digitos
  xmlContent: string; // Conteúdo XML simulado
  series: string;
  number: string;
  issuedAt: string;
}

export interface Sale {
  id: string;
  date: string;
  total: number;
  paymentMethod: 'credit' | 'debit' | 'cash' | 'pix';
  customerId?: string; // ID do Cliente (Supplier/Partner)
  customerName?: string; // Nome cacheado para exibição rápida
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceAtSale: number;
    costAtSale: number; // Added to snapshot COGS at time of sale
    isComposite?: boolean; // Snapshot to know if it was Resale or Manufactured
  }[];
  fiscal?: FiscalData; // Dados da Nota Fiscal Simulada (NFC-e)
}

// --- NEW TYPES FOR SUPPLIER MODULE ---

export interface PurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number; // Packages purchased
  cost: number; // Total cost for this line item
}

export interface PurchaseRecord {
  id: string;
  date: string;
  items: PurchaseItem[];
  totalValue: number;
  fiscal?: FiscalData; // Dados da Nota de Entrada Simulada (NFe)
}

export type PersonType = 'PF' | 'PJ';
export type PartnerRole = 'Cliente' | 'Fornecedor' | 'Técnico' | 'Vendedor' | 'Fabricante' | 'Transportadora' | 'Representada' | 'Credenciadora';

export interface Contact {
  id: string;
  name: string;
  phone?: string; // Telefone Fixo
  mobile?: string; // Celular
  email?: string;
  department?: string; // Departamento
  role?: string; // Cargo
}

export interface Supplier {
  id: string;
  // --- Dados Principais ---
  name: string; // Nome Fantasia
  legalName?: string; // Razão Social
  type: PersonType;
  document: string; // CPF ou CNPJ
  
  contactPerson: string; // Contato Principal (Legado/Resumo)
  phone: string;
  email: string;
  address: string;
  unitValue?: number; // Valor Unitário de Referência

  roles: PartnerRole[]; // Lista de papéis (ex: ['Fornecedor', 'Transportadora'])

  // --- Dados Opcionais ---
  group?: string; // Grupo
  code?: string; // Código Identificador Único
  foundationDate?: string; // Data Nascimento/Fundação
  registrationDate?: string; // Data Cadastro
  
  billingEmail?: string; // Email Faturamento
  commercialEmail?: string; // Email Comercial
  
  stateRegistration?: string; // Inscrição Estadual
  suframa?: string; // Inscrição Suframa

  contacts: Contact[]; // Lista de contatos adicionais
  history: PurchaseRecord[]; // Histórico de Compras (Nós compramos deles)
}

// --- DRE & FINANCIAL TYPES ---

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO Date
  category: 'Fixa' | 'Variável' | 'Pessoal' | 'Impostos' | 'Outros';
}

export interface LossRecord {
  id: string;
  date: string;
  description: string; // Ex: "Garrafa Gin Quebrada"
  value: number; // Valor de custo perdido
  quantity?: number;
}

export interface CompanySettings {
  legalName?: string;
  cnpj?: string;
  ie?: string; // Inscrição Estadual
  address?: string;
  regime?: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
}

export interface FinancialSettings {
  fixedCosts: number; // Monthly fixed costs (Rent, Salaries, etc.) - Legacy, prefer Expense records
  pixKey?: string;    // Chave PIX (CPF, CNPJ, Email, Phone, EVP)
  storeName?: string; // Nome da loja para o cupom
  logo?: string;      // Base64 string da logomarca
  company?: CompanySettings; // Dados fiscais da empresa
}

export interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  lowStockCount: number;
}
