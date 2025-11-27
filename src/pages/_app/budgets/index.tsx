import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_app/budgets')({
  component: BudgetsPage,
});

function BudgetsPage() {
  const sample = [
    { id: 1, client: 'Cliente A', date: '2025-11-01', total: 1200 },
    { id: 2, client: 'Cliente B', date: '2025-11-10', total: 850 },
  ];

  return (
    <div className="p-6">
      <div className='mb-4 flex items-center justify-between'>
        <h1 className='font-bold text-2xl'>Orçamentos</h1>
        <Link to="/budgets/create">
          <Button>Novo Orçamento</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {sample.map((b) => (
          <div
            className='flex items-center justify-between rounded border p-3'
            key={b.id}
          >
            <div>
              <div className="font-medium">{b.client}</div>
              <div className='text-muted-foreground text-sm'>{b.date}</div>
            </div>
            <div className="font-semibold">R$ {b.total.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
