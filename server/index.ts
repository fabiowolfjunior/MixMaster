import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Products ---
app.get('/api/products', async (req, res) => {
    const { q } = req.query;
    const where = q ? {
        OR: [
            { name: { contains: String(q) } },
            { barcode: { contains: String(q) } },
            { category: { contains: String(q) } }
        ]
    } : {};

    const products = await prisma.product.findMany({
        where,
        include: { recipeItems: true } // Include recipe for calculations
    });
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const { recipeItems, ...data } = req.body;
    try {
        const product = await prisma.product.create({
            data: {
                ...data,
                recipeItems: {
                    create: recipeItems
                }
            }
        });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

// --- Suppliers ---
app.get('/api/suppliers', async (req, res) => {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
});

app.post('/api/suppliers', async (req, res) => {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.json(supplier);
});

// --- Ingredients ---
app.get('/api/ingredients', async (req, res) => {
    const ingredients = await prisma.ingredient.findMany();
    res.json(ingredients);
});

app.post('/api/ingredients', async (req, res) => {
    const ingredient = await prisma.ingredient.create({ data: req.body });
    res.json(ingredient);
});

// --- Sales (Transaction) ---
app.post('/api/sales', async (req, res) => {
    const saleData = req.body;

    try {
        // Transaction: Verify Stock -> Deduct -> Create Sale
        const result = await prisma.$transaction(async (tx) => {
            const finalItems = [];

            for (const item of saleData.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    include: { recipeItems: true }
                });

                if (!product) throw new Error(`Produto ${item.productName} não encontrado`);

                // Determine ingredients to deduct
                // Logic: Composite uses recipe, Resale uses resaleIngredient logic
                let neededIngredients = [];

                if (product.isComposite) {
                    neededIngredients = product.recipeItems;
                } else if (product.resaleIngredientId) {
                    neededIngredients = [{
                        ingredientId: product.resaleIngredientId,
                        quantity: product.resaleQuantity || 1
                    }];
                }

                let itemCost = 0;

                for (const req of neededIngredients) {
                    const ing = await tx.ingredient.findUnique({ where: { id: req.ingredientId } });
                    if (!ing) throw new Error(`Ingrediente não encontrado`);

                    const totalNeeded = req.quantity * item.quantity;

                    if (ing.currentStock < totalNeeded) {
                        throw new Error(`Estoque insuficiente: ${ing.name}`);
                    }

                    const newStock = ing.currentStock - totalNeeded;
                    await tx.ingredient.update({
                        where: { id: ing.id },
                        data: { currentStock: newStock }
                    });

                    itemCost += (ing.costPerUnit * req.quantity);
                }

                finalItems.push({
                    ...item,
                    costAtSale: itemCost
                });
            }

            // Create Sale Record
            const sale = await tx.sale.create({
                data: {
                    total: saleData.total,
                    paymentMethod: saleData.paymentMethod,
                    customerId: saleData.customerId,
                    customerName: saleData.customerName,
                    date: new Date(),
                    items: {
                        create: finalItems.map(i => ({
                            productId: i.productId,
                            productName: i.productName,
                            quantity: i.quantity,
                            priceAtSale: i.priceAtSale,
                            costAtSale: i.costAtSale || 0
                        }))
                    },
                    fiscalJson: saleData.fiscal ? JSON.stringify(saleData.fiscal) : null
                }
            });

            return sale;
        });

        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// --- Expenses ---
app.get('/api/expenses', async (req, res) => {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.json(expenses);
});

app.post('/api/expenses', async (req, res) => {
    const expense = await prisma.expense.create({ data: req.body });
    res.json(expense);
});

app.delete('/api/expenses/:id', async (req, res) => {
    try {
        await prisma.expense.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Erro ao deletar" });
    }
});

// --- Losses ---
app.get('/api/losses', async (req, res) => {
    const losses = await prisma.lossRecord.findMany({ orderBy: { date: 'desc' } });
    res.json(losses);
});

app.post('/api/losses', async (req, res) => {
    const loss = await prisma.lossRecord.create({ data: req.body });
    res.json(loss);
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    res.json(settings || { fixedCosts: 0 });
});

app.post('/api/settings', async (req, res) => {
    const data = req.body;
    const settings = await prisma.settings.upsert({
        where: { id: 'default' },
        update: data,
        create: { id: 'default', ...data }
    });
    res.json(settings);
});

// --- Sales History ---
app.get('/api/sales', async (req, res) => {
    const sales = await prisma.sale.findMany({
        include: { items: true },
        orderBy: { date: 'desc' }
    });
    res.json(sales);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
