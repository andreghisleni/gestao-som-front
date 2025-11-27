"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getEquipmentsQueryKey, useCreateEquipment } from '@/http/generated';

const schema = z.object({
  name: z.string().min(1).describe('Nome'),
  category: z.string().min(1).describe('Categoria'),
  purchasePrice: z.number().min(0).describe('Preço de compra'),
  rentalPercentage: z.number().min(0).describe('Porcentagem de locação'),
  stockTotal: z.number().min(0).optional().describe('Estoque'),
});

type FormValues = z.infer<typeof schema>;

export function CreateEquipmentDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: '', purchasePrice: 0, rentalPercentage: 0, stockTotal: 0 },
  });

  const createEquipment = useCreateEquipment({
    mutation: {
      async onSuccess() {
        await queryClient.invalidateQueries({ queryKey: getEquipmentsQueryKey() });
        form.reset();
        setOpen(false);
        toast.success('Equipamento criado');
      },
      onError(error) {
        // biome-ignore lint/suspicious/noConsole: false
        console.log(error);
        // attempt to read message safely
        let message = String(error);
        if (typeof error === 'object' && error !== null && 'message' in error) {
          const m = (error as { message?: unknown }).message;
          if (typeof m === 'string') message = m;
        }
        toast.error('Erro ao criar equipamento', { description: message });
      },
    },
  });

  const purchase = form.watch('purchasePrice') ?? 0;
  const percent = form.watch('rentalPercentage') ?? 0;
  const rental = +(Number(purchase) * (Number(percent) / 100)).toFixed(2);

  async function onSubmit(values: FormValues) {
    await createEquipment.mutateAsync({ data: values });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Novo Equipamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Equipamento</DialogTitle>
          <DialogDescription>Cadastre um novo equipamento para o inventário</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rentalPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Locação</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-4">
              <Badge>Valor Locação: R$ {rental.toFixed(2)}</Badge>
            </div>

            <FormField
              control={form.control}
              name="stockTotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button className="w-full" type="submit">
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEquipmentDialog;
