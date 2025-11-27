import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const equipmentSchema = z.object({
  name: z.string().min(1),
  purchaseCost: z.number().min(0),
  percentage: z.number().min(0),
});

type EquipmentForm = z.infer<typeof equipmentSchema>;

export const Route = createFileRoute('/_app/inventory')({
  component: InventoryPage,
});

function InventoryPage() {
  const [items, setItems] = useState<Array<any>>([]);

  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { name: '', purchaseCost: 0, percentage: 0 },
  });

  function onSubmit(values: EquipmentForm) {
    const rental = +(
      values.purchaseCost *
      (1 + values.percentage / 100)
    ).toFixed(2);
    setItems((s) => [...s, { ...values, rental }]);
    form.reset();
  }

  const purchaseCost = form.watch('purchaseCost') ?? 0;
  const percentage = form.watch('percentage') ?? 0;
  const computed = +(purchaseCost * (1 + percentage / 100)).toFixed(2);

  return (
    <div className="p-6">
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='font-bold text-2xl'>Inventário</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Novo Equipamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Equipamento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo Compra</FormLabel>
                      <FormControl>
                        <Input step="0.01" type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porcentagem (%)</FormLabel>
                      <FormControl>
                        <Input step="0.01" type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-4">
                  <Badge>Valor locação: R$ {computed.toFixed(2)}</Badge>
                </div>

                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th>Nome</th>
              <th>Custo</th>
              <th>%</th>
              <th>Locação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr className="border-t" key={i}>
                <td className="py-2">{it.name}</td>
                <td>R$ {Number(it.purchaseCost).toFixed(2)}</td>
                <td>{it.percentage}%</td>
                <td>R$ {Number(it.rental).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
