/** biome-ignore-all lint/suspicious/useAwait: <explanation> */
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Eye,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getBudgetByIdQueryKey,
  useCreateBudgetOfferItem,
  useCreateBudgetShareLink,
  useDeleteBudgetOfferItem,
  useOrderBudgetOfferItems,
  useRevokeBudgetShareLink,
  useRotateBudgetShareLink,
  useUpdateBudgetOfferItem,
} from "@/http/generated";

/**
 * Linhas que o cliente lê na página pública.
 *
 * São texto de venda ("Sistema de som", "Karaokê com 30 mil músicas"), sem
 * equipamento e sem preço. O que precifica continua sendo a lista de
 * equipamentos da tela de orçamento — aqui só muda a apresentação.
 */
export type OfferLine = {
  id: string;
  name: string;
  detail: string | null;
  source: string;
  order: number;
};

/**
 * Subconjunto do orçamento usado por esta tela.
 *
 * Tipado à mão em vez de `GetBudgetById200` de propósito: assim o componente
 * compila antes do kubb ser regenerado e continua compatível depois, quando o
 * DTO gerado passar a trazer `offerItems` e os campos do link.
 */
export type BudgetLinkInfo = {
  /**
   * Presente só para o tipo continuar "forte": assim o `budget` vindo do
   * `useGetBudgetById` atual (sem os campos novos) é aceito aqui, e o card
   * funciona tanto antes quanto depois do `bun run generate` do kubb.
   */
  id: string;
  publicToken?: string | null;
  publicTokenRevoked?: string | null;
  publicViewCount?: number;
  offerItems?: OfferLine[] | null;
};

type Props = {
  budgetId: string;
  budget: BudgetLinkInfo;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
export function PublicOfferCard({ budgetId, budget }: Props) {
  const publicToken = budget.publicToken ?? null;
  const publicTokenRevoked = budget.publicTokenRevoked ?? null;
  const publicViewCount = budget.publicViewCount ?? 0;
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<OfferLine[]>(budget.offerItems ?? []);
  const [newName, setNewName] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => setLines(budget.offerItems ?? []), [budget.offerItems]);

  const shareUrl = publicToken
    ? `${window.location.protocol}//${window.location.host}/p/${publicToken}`
    : null;

  const createLink = useCreateBudgetShareLink();
  const revokeLink = useRevokeBudgetShareLink();
  const rotateLink = useRotateBudgetShareLink();
  const createItem = useCreateBudgetOfferItem();
  const updateItem = useUpdateBudgetOfferItem();
  const deleteItem = useDeleteBudgetOfferItem();
  const orderItems = useOrderBudgetOfferItems();

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: getBudgetByIdQueryKey(budgetId),
    });
  };

  const onGenerate = async () => {
    try {
      await createLink.mutateAsync({ budgetId });
      await refresh();
      toast.success("Link público pronto. Pode enviar para o cliente.");
    } catch {
      toast.error("Não foi possível gerar o link.");
    }
  };

  const onCopy = async () => {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onRevoke = async () => {
    try {
      await revokeLink.mutateAsync({ budgetId });
      await refresh();
      toast("Link revogado. O cliente não consegue mais abrir a página.");
    } catch {
      toast.error("Não foi possível revogar o link.");
    }
  };

  const onRotate = async () => {
    try {
      await rotateLink.mutateAsync({ budgetId });
      await refresh();
      setConfirmRotate(false);
      toast.success("Link novo gerado. O anterior parou de funcionar.");
    } catch {
      toast.error("Não foi possível trocar o link.");
    }
  };

  const onAddLine = async () => {
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Escreva pelo menos o nome da linha (ex.: Sistema de som).");
      return;
    }
    if (lines.length >= 12) {
      toast.error("A proposta pública tem no máximo 12 linhas.");
      return;
    }
    try {
      await createItem.mutateAsync({
        budgetId,
        data: { name, detail: newDetail.trim() || null, order: lines.length },
      });
      setNewName("");
      setNewDetail("");
      await refresh();
    } catch {
      toast.error("Não foi possível adicionar a linha.");
    }
  };

  const onPatchLine = async (id: string, patch: Partial<OfferLine>) => {
    setLines((current) =>
      current.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const onSaveLine = async (line: OfferLine) => {
    if (line.name.trim().length < 2) {
      toast.error("O nome da linha não pode ficar vazio.");
      return;
    }
    try {
      await updateItem.mutateAsync({
        budgetId,
        id: line.id,
        data: { name: line.name.trim(), detail: line.detail?.trim() || null },
      });
      await refresh();
      toast.success("Linha atualizada.");
    } catch {
      toast.error("Não foi possível salvar a linha.");
    }
  };

  const onDeleteLine = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ budgetId, id });
      await refresh();
    } catch {
      toast.error("Não foi possível remover a linha.");
    }
  };

  const onMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lines.length) {
      return;
    }
    const next = [...lines];
    [next[index], next[target]] = [next[target], next[index]];
    setLines(next);
    try {
      await orderItems.mutateAsync({
        budgetId,
        data: { ids: next.map((l) => l.id) },
      });
      await refresh();
    } catch {
      toast.error("Não foi possível reordenar.");
    }
  };

  const revoked = Boolean(publicTokenRevoked) && !publicToken;

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/40 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" /> Página pública do evento
        </CardTitle>
        <div
          className="flex items-center gap-2 text-muted-foreground text-xs"
          title="Visitas, não aberturas: recarregar dentro da janela (PUBLIC_VIEW_WINDOW_MINUTES no .env do back, 30 min por padrão) conta como uma visita só, e preview de robô não entra na conta. O detalhe por aparelho está no card Dados do evento."
        >
          <Eye className="h-3.5 w-3.5" />
          {publicViewCount} {publicViewCount === 1 ? "visita" : "visitas"}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {publicToken ? (
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">
              Link para enviar ao cliente
            </Label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-xs"
                readOnly
                value={shareUrl ?? ""}
              />
              <Button onClick={onCopy} size="icon" variant="outline">
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCopy} size="sm" variant="outline">
                <Copy className="mr-2 h-3.5 w-3.5" /> Copiar link
              </Button>
              <Button onClick={onRevoke} size="sm" variant="outline">
                <Unlink className="mr-2 h-3.5 w-3.5" /> Revogar
              </Button>
              {confirmRotate ? (
                <span className="flex items-center gap-2">
                  <Button onClick={onRotate} size="sm" variant="destructive">
                    Confirmar troca
                  </Button>
                  <Button
                    onClick={() => setConfirmRotate(false)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </span>
              ) : (
                <Button
                  onClick={() => setConfirmRotate(true)}
                  size="sm"
                  variant="ghost"
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Gerar novo link
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Trocar o link derruba o anterior — útil se você enviou para a
              pessoa errada.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 p-4">
            <p className="text-muted-foreground text-sm">
              {revoked
                ? "Este link foi revogado. Gere um novo para reabrir a coleta de dados."
                : "Gere o link para o cliente confirmar contratante, local, horários e repertório. O valor mostrado é o fechamento atual."}
            </p>
            <Button
              disabled={createLink.isPending}
              onClick={onGenerate}
              size="sm"
            >
              {createLink.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Gerar link público
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-sm">
              O que está incluso (texto da proposta)
            </Label>
            <Badge variant="outline">{lines.length}/12</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Não aparece equipamento nem preço. Só a descrição que o cliente lê —
            e você pode ajustar quando quiser.
          </p>

          {lines.map((line, index) => (
            <div className="rounded-lg border bg-card p-3" key={line.id}>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 font-medium text-sm"
                  onBlur={() => onSaveLine(line)}
                  onChange={(e) =>
                    onPatchLine(line.id, { name: e.target.value })
                  }
                  placeholder="Ex.: Sistema de som"
                  value={line.name}
                />
                {line.source === "AUTO" && (
                  <Badge className="shrink-0" variant="secondary">
                    auto
                  </Badge>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    aria-label="Subir"
                    className="h-8 w-8 p-0"
                    disabled={index === 0 || orderItems.isPending}
                    onClick={() => onMove(index, -1)}
                    variant="ghost"
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label="Descer"
                    className="h-8 w-8 p-0"
                    disabled={
                      index === lines.length - 1 || orderItems.isPending
                    }
                    onClick={() => onMove(index, 1)}
                    variant="ghost"
                  >
                    ↓
                  </Button>
                  <Button
                    className="h-8 w-8 p-0"
                    disabled={deleteItem.isPending}
                    onClick={() => onDeleteLine(line.id)}
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <Input
                className="mt-2 h-8 text-xs"
                onBlur={() => onSaveLine(line)}
                onChange={(e) =>
                  onPatchLine(line.id, { detail: e.target.value })
                }
                placeholder="Detalhe opcional (ex.: PA + subgrave para até 200 pessoas)"
                value={line.detail ?? ""}
              />
            </div>
          ))}

          {lines.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-muted-foreground text-sm">
              Nenhuma linha ainda. Adicione abaixo ou gere o link — o sistema
              aproveita os nomes dos ambientes como ponto de partida.
            </div>
          )}

          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                className="h-9"
                maxLength={120}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da linha"
                value={newName}
              />
              <Input
                className="h-9"
                maxLength={280}
                onChange={(e) => setNewDetail(e.target.value)}
                placeholder="Detalhe (opcional)"
                value={newDetail}
              />
              <Button
                disabled={createItem.isPending}
                onClick={onAddLine}
                variant="secondary"
              >
                {createItem.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-muted-foreground text-xs">
          <Save className="h-4 w-4 shrink-0 text-primary" />
          Ao salvar uma linha, a página pública já mostra o texto novo na
          próxima abertura do link.
        </div>
      </CardContent>
    </Card>
  );
}
