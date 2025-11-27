import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetBudget } from '@/http/generated';

export const Route = createFileRoute('/_app/budgets/$budgetId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const budgetId = Route.useParams().budgetId as string;
  const { data, isLoading } = useGetBudget(budgetId);

  if (isLoading) return <div>Loading...</div>;

  const client = data?.clientName ?? '-';
  const date = data?.eventDate ? format(new Date(String(data.eventDate)), 'dd/MM/yyyy') : '-';

  return (
    <div className="px-8 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-3xl tracking-tight">Orçamento: {client}</h2>
          <div className="text-sm text-muted-foreground">Data: {date} • Status: {data?.status}</div>
        </div>
        <div>
          <Button variant="outline" onClick={() => window.print()}>Imprimir</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">R$ {(data?.totalValue ?? 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Desconto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{(data?.discount ?? 0).toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mão de Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">R$ 0.00</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {(data?.sections || []).map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(section.items || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.equipment?.name ?? item.equipmentId}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>R$ {(item.unitPrice ?? item.equipment?.baseRentalPrice ?? 0).toFixed(2)}</TableCell>
                      <TableCell>R$ {(item.subtotal ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
