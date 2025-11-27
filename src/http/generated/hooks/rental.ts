import { api } from '@/lib/api';

export async function fetchEquipments() {
  const { data } = await api.get('/rental/equipments');
  return data;
}

export async function fetchBudgets() {
  const { data } = await api.get('/rental/budgets');
  return data;
}

export async function createBudget(payload: any) {
  const { data } = await api.post('/rental/budgets', payload);
  return data;
}
