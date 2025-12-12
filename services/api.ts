const API_URL = 'http://localhost:3001/api';

export const api = {
    products: {
        list: async (q?: string) => {
            const res = await fetch(`${API_URL}/products${q ? `?q=${q}` : ''}`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Falha ao criar produto');
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Falha ao atualizar produto');
            return res.json();
        }
    },
    batches: {
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    suppliers: {
        list: async () => {
            const res = await fetch(`${API_URL}/suppliers`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/suppliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/suppliers/${id}`, {
                method: 'DELETE'
            });
            return res.json();
        }
    },
    ingredients: {
        list: async () => {
            const res = await fetch(`${API_URL}/ingredients`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/ingredients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/ingredients/${id}`, {
                method: 'DELETE'
            });
            return res.json();
        }
    },
    sales: {
        list: async () => {
            const res = await fetch(`${API_URL}/sales`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao processar venda');
            return json;
        }
    },
    expenses: {
        list: async () => {
            const res = await fetch(`${API_URL}/expenses`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
            return res.json();
        }
    },
    losses: {
        list: async () => {
            const res = await fetch(`${API_URL}/losses`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/losses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    settings: {
        get: async () => {
            const res = await fetch(`${API_URL}/settings`);
            return res.json();
        },
        upsert: async (data: any) => {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    drivers: {
        list: async () => {
            const res = await fetch(`${API_URL}/drivers`);
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_URL}/drivers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    routes: {
        list: async () => {
            const res = await fetch(`${API_URL}/routes`);
            return res.json();
        },
        create: async (data: { driverId: string, saleIds: string[] }) => {
            const res = await fetch(`${API_URL}/routes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Erro ao criar rota');
            }
            return res.json();
        }
    }
};
