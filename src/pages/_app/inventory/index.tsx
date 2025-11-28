import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Suspense } from 'react';
import { DataTable } from '@/components/data-table';
import { FilterBase } from '@/components/filter-base';
import { Pagination } from '@/components/pagination';
import { usePagination } from '@/hooks/use-pagination';
import type { GetEquipments200 } from '@/http/generated';
import { useGetEquipments } from '@/http/generated';
import CreateEquipmentDialog from './-components/create-equipment-dialog';

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
