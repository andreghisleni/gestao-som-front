import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_app/budgets/create')({
  component: BudgetsCreate,
});

type Item = { equipmentId: string; price: number };
type Environment = { name: string; items: Item[] };
type FormValues = {
  client: string;
  date: string;
  environments: Environment[];
  discount: number;
};

function BudgetsCreate() {
  const form = useForm<FormValues>({
    defaultValues: { client: '', date: '', discount: 0, environments: [] },
  });

  const envs = useFieldArray({ control: form.control, name: 'environments' });

  // Fetch equipments for select (simple)
  const [equipments, setEquipments] = (() => {
    // tiny local hook
    const state: any[] = [] as any[];
    return [state, (v: any[]) => (state.length = 0) || state.push(...v)];
  })();

  useEffect(() => {
    api
      .get('/rental/equipments')
      .then((r) => {
        if (r?.data) setEquipments(r.data);
      })
      .catch(() => { });
  }, []);

  const totalBruto = useMemo(() => {
    const envs = form.getValues('environments') || [];
    let sum = 0;
    envs.forEach((e) =>
      e.items?.forEach((it) => (sum += Number(it.price || 0)))
    );
    return sum;
  }, [form]);

  const discount = form.watch('discount') ?? 0;
  const totalLiquido = +(totalBruto * (1 - (discount || 0) / 100)).toFixed(2);

  function addEnvironment() {
    envs.append({ name: 'Ambiente', items: [] });
  }

  return (
    <div className='grid grid-cols-1 gap-6 p-6 lg:grid-cols-3'>
      <div className="lg:col-span-2">
        <h1 className='mb-4 font-bold text-2xl'>Gerar Orçamento</h1>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Cliente" {...form.register('client')} />
            <Input type="date" {...form.register('date')} />
          </div>

          <div>
            <div className='mb-2 flex items-center justify-between'>
              <h2 className="font-medium">Ambientes</h2>
              <Button onClick={addEnvironment} variant="ghost">
                Adicionar Ambiente
              </Button>
            </div>

            <div className="space-y-4">
              {envs.fields.map((env, idx) => (
                <Card key={env.id}>
                  <CardHeader>
                    <CardTitle>
                      <Input
                        placeholder="Nome do ambiente"
                        {...form.register(`environments.${idx}.name` as const)}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Simplified: add one item select + price input */}
                        <Select>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Equipamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {((equipments as any[]) || []).map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Preço" type="number" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                Total Bruto: R$ {totalBruto.toFixed(2)}
              </div>
              <div className="mb-2">
                Desconto (%):{' '}
                <Input type="number" {...form.register('discount')} />
              </div>
              <div className="font-semibold">
                Total Líquido: R$ {totalLiquido.toFixed(2)}
              </div>
              <div className="mt-4">
                <Button className="w-full">Salvar Orçamento</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
