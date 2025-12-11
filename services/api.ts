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
    }
};
