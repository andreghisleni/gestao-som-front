import { createFileRoute } from '@tanstack/react-router';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Suspense } from 'react';
import { DataTable } from '@/components/data-table';
import { FilterBase } from '@/components/filter-base';
import { Pagination } from '@/components/pagination';
import { usePagination } from '@/hooks/use-pagination';
import { useGetEquipments } from '@/http/generated';
import CreateEquipmentDialog from './-components/create-equipment-dialog';
import type { GetEquipments200 } from '@/http/generated';
import type { ColumnDef } from '@tanstack/react-table';

export const Route = createFileRoute('/_app/inventory/')({
  component: RouteComponent,
});

type Equipment = GetEquipments200['data'][0];

const columns: ColumnDef<Equipment>[] = [
  { accessorKey: 'name', header: 'Nome' },
  { accessorKey: 'category', header: 'Categoria' },
  {
    accessorKey: 'purchasePrice',
    header: 'Preço Compra',
    cell: ({ row }) => `R$ ${Number(row.getValue('purchasePrice')).toFixed(2)}`,
  },
  { accessorKey: 'stockTotal', header: 'Estoque' },
];

function RouteComponent() {
  const [{ pageIndex, pageSize, filter }] = useQueryStates({
    pageIndex: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    filter: parseAsString.withDefault(''),
  });

  const { data, isLoading } = useGetEquipments({
    'p.page': pageIndex,
    'p.pageSize': pageSize,
    'f.filter': filter?.length ? filter : undefined,
  });

  const { totalPages, total, navigateToPage, setPageSize, showing } =
    usePagination({
      total: data?.meta.total,
      showing: data?.data.length,
    });

  return (
    <div className="px-8 pt-8">
      <h2 className="font-bold text-3xl tracking-tight">Inventário</h2>
      <DataTable
        addComponent={<CreateEquipmentDialog />}
        columns={columns}
        data={data?.data || []}
        filterComponent={<FilterBase />}
        ifJustFilterComponent
        loading={isLoading}
        paginationComponent={
          <Suspense fallback={null}>
            <Pagination
              {...{
                items: total,
                page: pageIndex,
                pages: totalPages,
                limit: pageSize,
                showing,
                handleUpdatePage: navigateToPage,
                handleChangeLimit: setPageSize,
              }}
            />
          </Suspense>
        }
      />
    </div>
  );
}
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
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
import { useGetEquipments } from '@/http/generated/hooks/useGetEquipments';
import { useCreateEquipment } from '@/http/generated/hooks/useCreateEquipment';

const equipmentSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  purchasePrice: z.number().min(0),
  rentalPercentage: z.number().min(0),
});

type EquipmentForm = z.infer<typeof equipmentSchema>;

export const Route = createFileRoute('/_app/inventory')({
  component: InventoryPage,
});

function InventoryPage() {
  const equipmentsQuery = useGetEquipments();
  const createEquipment = useCreateEquipment();

  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { name: '', category: '', purchasePrice: 0, rentalPercentage: 0 },
  });

  async function onSubmit(values: EquipmentForm) {
    try {
      await createEquipment.mutateAsync({ data: values });
      // refresh list
      await equipmentsQuery.refetch();
      form.reset();
    } catch (err) {
      // noop - let developer handle notifications as needed
      console.error(err);
    }
  }

  const purchasePrice = Number(form.watch('purchasePrice') ?? 0);
  const rentalPercentage = Number(form.watch('rentalPercentage') ?? 0);
  const computed = useMemo(() => {
    return +(purchasePrice * (1 + rentalPercentage / 100)).toFixed(2);
  }, [purchasePrice, rentalPercentage]);

  const list = equipmentsQuery.data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Inventário</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Novo Equipamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Equipamento</DialogTitle>
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

                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Compra</FormLabel>
                      <FormControl>
                        <Input step="0.01" type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rentalPercentage"
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
                  <Badge>Valor Locação: R$ {computed.toFixed(2)}</Badge>
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
              <th>Categoria</th>
              <th>Custo</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {list.map((it) => (
              <tr className="border-t" key={it.id}>
                <td className="py-2">{it.name}</td>
                <td>{it.category}</td>
                <td>R$ {Number(it.purchasePrice).toFixed(2)}</td>
                <td>{it.stockTotal ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
