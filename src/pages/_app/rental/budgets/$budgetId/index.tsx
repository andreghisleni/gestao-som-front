import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetBudgetById } from "@/http/generated";
import { formatToBRL } from "@/utils/formatToBRL";
import { CreateItemDialog } from "./-components/create-item-dialog";
import { CreateSectionDialog } from "./-components/create-section-dialog";

// Aqui virão os componentes para adicionar Seções e Itens
// import { AddSectionDialog } from './-components/add-section-dialog';

export const Route = createFileRoute("/_app/rental/budgets/$budgetId/")({
  component: BudgetDetailsPage,
});

function BudgetDetailsPage() {
  const { budgetId } = Route.useParams();

  // Busca os dados completos (incluindo sections e items)
  const { data: budget, isLoading } = useGetBudgetById(budgetId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!budget) {
    return <div>Orçamento não encontrado.</div>;
  }

  return (
    <div className="space-y-6 p-8">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            {budget.clientName}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <span>
              {format(new Date(budget.eventDate), "dd/MM/yyyy 'às' HH:mm")}
            </span>
            <span>•</span>
            <Badge variant="outline">{budget.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          {/* Botão para Editar Cabeçalho (Cliente/Data) se necessário */}
        </div>
      </div>

      {/* RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Total Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatToBRL(budget.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Mão de Obra / Frete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatToBRL(
                (budget.laborCost || 0) + (budget.transportCost || 0)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Descontos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-500">
              -{formatToBRL(budget.discount)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-primary text-sm">
              Valor Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-primary">
              {formatToBRL(budget.finalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ÁREA DE CONTEÚDO (AMBIENTES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">Ambientes e Itens</h2>
          {/* Botão de Adicionar Ambiente */}
          <CreateSectionDialog />
        </div>

        {budget.sections?.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/10 py-12 text-center text-muted-foreground">
            Nenhum ambiente cadastrado. Comece adicionando um (ex: Palco,
            Cerimônia).
          </div>
        )}

        {budget.sections?.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between bg-muted/30 py-3">
              <CardTitle className="font-semibold text-base">
                {section.name}
              </CardTitle>

              {/* Botão de Adicionar Item nesta seção */}
              <CreateItemDialog
                sectionId={section.id}
                sectionName={section.name}
              />
            </CardHeader>
            <CardContent className="p-0">
              {!section.items || section.items.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum item neste ambiente.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10 text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Equipamento</th>
                      <th className="w-24 px-4 py-2 text-center font-medium">
                        Qtd
                      </th>
                      <th className="w-32 px-4 py-2 text-right font-medium">
                        Unitário
                      </th>
                      <th className="w-32 px-4 py-2 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items?.map((item) => (
                      <tr
                        className="border-b transition-colors last:border-0 hover:bg-muted/5"
                        key={item.id}
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium">
                            {item.equipment?.name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {item.equipment?.category?.name}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatToBRL(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatToBRL(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
