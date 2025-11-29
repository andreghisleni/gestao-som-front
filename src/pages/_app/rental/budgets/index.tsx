import { createFileRoute, Link } from '@tanstack/react-router';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Suspense } from 'react';
import { DataTable } from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { usePagination } from '@/hooks/use-pagination';
import { useListBudgets } from '@/http/generated';
import { formatToBRL } from '@/utils/formatToBRL';

export const Route = createFileRoute('/_app/rental/budgets/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [{ pageIndex, pageSize, filter, ...rest }] = useQueryStates({
    pageIndex: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    filter: parseAsString.withDefault(''),
    'ob.createdAt': parseAsString.withDefault(''),
  });

  const { data, isLoading } = useListBudgets({
    'p.page': pageIndex,
    'p.pageSize': pageSize,
    'f.filter': filter.length > 0 ? filter : undefined,
    'ob.createdAt': rest['ob.createdAt'] || undefined,
  });

  const { totalPages, total, navigateToPage, setPageSize, showing } =
    usePagination({
      total: data?.meta.total,
      showing: data?.data.length,
    });

  const columns = [
    {
      accessorKey: 'clientName',
      header: 'Cliente',
      cell: ({ row }: any) => <span>{row.original.clientName}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Data',
      cell: ({ row }: any) => <span>{new Date(row.original.createdAt).toLocaleDateString()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => <span>{row.original.status}</span>,
    },
    {
      accessorKey: 'total',
      header: 'Valor',
      cell: ({ row }: any) => <span>{formatToBRL(row.original.total)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Link to={'/_app/rental/budgets/$id'} params={{ id: row.original.id }}>
          Ver
        </Link>
      ),
    },
  ];

  return (
    <div className="px-8 pt-8">
      <h2 className="font-bold text-3xl tracking-tight">Orçamentos</h2>
      <DataTable
        columns={columns}
        data={data?.data || []}
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

export default Route;
