"use client";

import { createFileRoute } from '@tanstack/react-router';
import { useFieldArray, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useListEquipments, useCreateBudget } from '@/http/generated';
import { formatToBRL } from '@/utils/formatToBRL';

export const Route = createFileRoute('/_app/rental/budgets/create')({
  component: RouteComponent,
});

type Item = {
  equipmentId: string;
  quantity: number;
  price: number;
};

type Section = {
  name: string;
  items: Item[];
};

type FormValues = {
  clientName: string;
  sections: Section[];
};

function RouteComponent() {
  const form = useForm<FormValues>({
    defaultValues: { clientName: '', sections: [{ name: 'Ambiente 1', items: [{ equipmentId: '', quantity: 1, price: 0 }] }], },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({ control: form.control, name: 'sections' });

  const { data: equipments } = useListEquipments();
  const createBudget = useCreateBudget({});

  const watch = form.watch();

  // When equipmentId changes, populate price
  useEffect(() => {
    sectionFields.forEach((s, sIndex) => {
      const items = form.getValues(`sections.${sIndex}.items`) || [];
      items.forEach((it: Item, iIndex: number) => {
        const eq = equipments?.data.find((e) => e.id === it.equipmentId);
        if (eq && eq.purchasePrice !== it.price) {
          form.setValue(`sections.${sIndex}.items.${iIndex}.price`, eq.purchasePrice);
        }
      });
    });
  }, [form, sectionFields, equipments]);

  const total = (form.getValues('sections') || []).reduce((acc: number, s: Section) => {
    const st = (s.items || []).reduce((a, it) => a + (it.price || 0) * (it.quantity || 0), 0);
    return acc + st;
  }, 0);

  async function onSubmit(v: FormValues) {
    // Transform into API payload shape accordingly
    await createBudget.mutateAsync({ data: v as any });
  }

  return (
    <div className="px-8 pt-8">
      <h2 className="font-bold text-3xl tracking-tight">Criar Orçamento</h2>
      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label>Cliente</label>
              <Input {...form.register('clientName')} />
            </div>

            {sectionFields.map((section, sIndex) => (
              <Card key={section.id} className="p-4">
                <div className="flex items-center justify-between">
                  <input className="border px-2 py-1" {...form.register(`sections.${sIndex}.name` as const)} />
                  <div>
                    <Button type="button" onClick={() => appendSection({ name: 'Novo ambiente', items: [{ equipmentId: '', quantity: 1, price: 0 }] })}>+ Ambiente</Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <SectionItems sIndex={sIndex} form={form} equipments={equipments?.data || []} />
                </div>
              </Card>
            ))}

            <div>
              <Button type="submit">Salvar Orçamento</Button>
            </div>
          </form>
        </div>

        <div className="col-span-1">
          <div className="sticky top-20">
            <Card className="p-4">
              <h3 className="font-bold">Resumo</h3>
              <div className="mt-4">
                <div>Total: {formatToBRL(total)}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionItems({ sIndex, form, equipments }: { sIndex: number; form: any; equipments: any[] }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: `sections.${sIndex}.items` });

  return (
    <div>
      {fields.map((f, idx) => (
        <div key={f.id} className="grid grid-cols-4 gap-2 items-end">
          <div>
            <label>Equipamento</label>
            <select className="w-full" {...form.register(`sections.${sIndex}.items.${idx}.equipmentId`)}>
              <option value="">Selecione</option>
              {equipments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Quantidade</label>
            <input type="number" className="w-full" {...form.register(`sections.${sIndex}.items.${idx}.quantity`, { valueAsNumber: true })} />
          </div>
          <div>
            <label>Preço</label>
            <input type="number" className="w-full" {...form.register(`sections.${sIndex}.items.${idx}.price`, { valueAsNumber: true })} />
          </div>
          <div>
            <Button type="button" onClick={() => remove(idx)}>Remover</Button>
          </div>
        </div>
      ))}
      <div className="mt-2">
        <Button type="button" onClick={() => append({ equipmentId: '', quantity: 1, price: 0 })}>Adicionar Item</Button>
      </div>
    </div>
  );
}

export default Route;
