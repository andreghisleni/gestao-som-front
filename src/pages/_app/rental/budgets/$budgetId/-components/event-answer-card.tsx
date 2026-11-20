/**
 * Resposta do formulário público, dentro do orçamento.
 *
 * É a mesma tela de revisão que o cliente vê antes de enviar — mesmos blocos,
 * mesmas etiquetas — com três coisas a mais que só quem atende precisa ver: a
 * trilha do aceite (data, IP, user agent), o botão de pedir uma nova revisão e
 * o histórico das respostas anteriores com o que mudou de uma para a outra.
 *
 * O botão não apaga nada: ele congela a resposta atual numa versão arquivada e
 * libera o mesmo link para um novo envio. A cópia de trabalho continua intacta,
 * então o cliente retoma exatamente do rascunho dele.
 */
/** biome-ignore-all lint/complexity/noVoid: <explanation> */
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Archive,
  ClipboardList,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBudgetByIdQueryKey,
  useGetBudgetEventDetails,
  useGetEventFormOptions,
  useRequestBudgetEventReview,
} from "@/http/generated";
import { AnswerReview } from "@/pages/p/-components/answer-review";
import { diffAnswers, groupDiff } from "@/pages/p/-diff";
import type { FormState } from "@/pages/p/-form";
import { detailsToForm, emptyForm } from "@/pages/p/-form";
import type { FormOptionsDto, PublicDetailsDto } from "@/pages/p/-types";
import { formatToBRL } from "@/utils/formatToBRL";

/**
 * Tipos espelhando `GET /rental/budgets/:budgetId/event-details` no backend.
 *
 * À mão de propósito, pelo mesmo motivo de `pages/p/-types.ts`: o componente
 * compila antes do kubb ser regenerado e não quebra quando um campo interno do
 * orçamento muda de forma. O conteúdo da resposta é o DTO público — mesmo
 * objeto, só lido por dentro.
 */
type EventAnswerDto = Omit<PublicDetailsDto, "id" | "stepSeen" | "completedAt">;

type AcceptanceDto = {
  acceptedName: string;
  acceptedValue: number;
  acceptedAt: string;
  acceptedIp: string | null;
  userAgent: string | null;
};

type RevisionDto = {
  id: string;
  version: number;
  data: EventAnswerDto;
  submittedAt: string | null;
  acceptance: AcceptanceDto | null;
  reason: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  resolvedAt: string | null;
};

type EventDetailsDto = {
  budgetId: string;
  status: string;
  clientName: string;
  eventDate: string;
  agreedValue: number;
  protocol: string | null;
  publicUrl: string | null;
  publicViewCount: number;
  submitted: boolean;
  durationMinutes: number | null;
  details: PublicDetailsDto | null;
  acceptance: AcceptanceDto | null;
  openReview: RevisionDto | null;
  revisions: RevisionDto[];
};

const dateTime = (value: string | null): string =>
  value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm") : "—";

/** Resposta (viva ou congelada) → estado do formulário, com as máscaras. */
function toForm(answer: EventAnswerDto | PublicDetailsDto): FormState {
  const details = answer as PublicDetailsDto;
  return { ...emptyForm, ...detailsToForm(details) };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
export function EventAnswerCard({ budgetId }: { budgetId: string }) {
  const detailsQuery = useGetBudgetEventDetails(budgetId);
  const optionsQuery = useGetEventFormOptions();
  const requestReview = useRequestBudgetEventReview();
  const queryClient = useQueryClient();

  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  /** null = resposta atual; número = versão arquivada sendo relida. */
  const [version, setVersion] = useState<number | null>(null);

  const data = detailsQuery.data as EventDetailsDto | undefined;
  const details = data?.details ?? null;
  const revisions = data?.revisions ?? [];
  // Mesma regra da página pública: o DTO é estreitado uma vez só, no topo.
  const options = optionsQuery.data as FormOptionsDto | undefined;

  const frozen =
    version == null
      ? null
      : (revisions.find((item) => item.version === version) ?? null);
  const changes =
    frozen && details
      ? diffAnswers(toForm(frozen.data), toForm(details), options)
      : [];
  // Quem abre a v1 quer ver o aceite DAQUELA resposta, não o de agora.
  const acceptance = frozen ? frozen.acceptance : (data?.acceptance ?? null);

  const onAsk = async () => {
    try {
      const response = await requestReview.mutateAsync({
        budgetId,
        data: { reason: reason.trim() || null },
      });
      const created = (response as { created?: boolean })?.created !== false;
      toast.success(
        created
          ? "Resposta arquivada. O link voltou a aceitar envio."
          : "Já existia um pedido de revisão em aberto.",
      );
      setAsking(false);
      setReason("");
      setVersion(null);
      await detailsQuery.refetch();
      await queryClient.invalidateQueries({
        queryKey: getBudgetByIdQueryKey(budgetId),
      });
    } catch {
      toast.error("Não foi possível pedir a revisão agora.");
    }
  };

  if (detailsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Dados do evento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando a resposta do cliente…
        </CardContent>
      </Card>
    );
  }

  if (!(data && details)) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Dados do evento
          </CardTitle>
          <Badge variant="secondary">ainda sem resposta</Badge>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm leading-relaxed">
          {data?.publicUrl
            ? `O link está no ar${
                (data.publicViewCount ?? 0) > 0
                  ? ` e já foi aberto ${data.publicViewCount} vez(es)`
                  : " e ainda não foi aberto"
              }. Assim que o cliente responder, os dados aparecem aqui, no mesmo
              formato da tela de revisão que ele confere antes de enviar.`
            : "Gere o link público no cartão acima para pedir os dados do evento ao cliente."}
        </CardContent>
      </Card>
    );
  }

  const nextVersion = (revisions[0]?.version ?? 0) + 1;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Dados do evento
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {data.submitted ? (
            <Badge variant="default">
              enviado {dateTime(details.completedAt)}
            </Badge>
          ) : (
            <Badge variant="outline">rascunho salvo</Badge>
          )}
          {data.openReview && (
            <Badge variant="destructive">revisão pedida</Badge>
          )}
          {data.protocol && (
            <span className="rounded-md border border-dashed bg-muted/40 px-2 py-1 font-mono text-xs">
              {data.protocol}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.openReview && (
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Você pediu uma nova revisão</AlertTitle>
            <AlertDescription className="space-y-1">
              <span className="block">
                {data.openReview.reason?.trim() ||
                  "Sem motivo escrito — vale explicar também no WhatsApp."}
              </span>
              <span className="block text-muted-foreground text-xs">
                Pedida em {dateTime(data.openReview.requestedAt)}. A resposta v
                {data.openReview.version} está arquivada e o mesmo link voltou a
                aceitar envio.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {revisions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <History className="mr-1 h-4 w-4 text-muted-foreground" />
            <Button
              onClick={() => setVersion(null)}
              size="sm"
              variant={version === null ? "default" : "ghost"}
            >
              Resposta atual
            </Button>
            {revisions.map((item) => (
              <Button
                key={item.id}
                onClick={() => setVersion(item.version)}
                size="sm"
                variant={version === item.version ? "default" : "ghost"}
              >
                v{item.version}
              </Button>
            ))}
          </div>
        )}

        {frozen ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cópia congelada em {dateTime(frozen.requestedAt)}
              {frozen.submittedAt
                ? `, enviada pelo cliente em ${dateTime(frozen.submittedAt)}`
                : ", ainda sem envio concluído"}
              {frozen.resolvedAt
                ? ` · substituída em ${dateTime(frozen.resolvedAt)}`
                : " · aguardando o reenvio"}
            </p>

            <div className="overflow-hidden rounded-lg border">
              <p className="bg-muted px-4 py-2.5 font-semibold text-sm">
                O que mudou desde a v{frozen.version}
              </p>
              {changes.length === 0 ? (
                <p className="px-4 py-3 text-muted-foreground text-sm">
                  Nada mudou desde esta cópia.
                </p>
              ) : (
                groupDiff(changes).map(([group, lines]) => (
                  <div key={group}>
                    <p className="border-t bg-muted/40 px-4 py-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                      {group}
                    </p>
                    {lines.map((line) => (
                      <div
                        className="grid gap-1 border-t px-4 py-2.5 text-sm sm:grid-cols-[170px_1fr_1fr] sm:gap-4"
                        key={`${group}-${line.label}`}
                      >
                        <span className="text-muted-foreground">
                          {line.label}
                        </span>
                        <span className="text-muted-foreground line-through">
                          {line.before || "—"}
                        </span>
                        <span className="font-medium">{line.after || "—"}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <AnswerReview form={toForm(frozen.data)} options={options} />
          </div>
        ) : (
          <AnswerReview form={toForm(details)} options={options} />
        )}

        <div className="rounded-lg bg-primary p-5 text-primary-foreground">
          <p className="font-medium text-[11px] uppercase tracking-wider opacity-80">
            {frozen
              ? `Aceite registrado na v${frozen.version}`
              : "Aceite registrado"}
          </p>
          <p className="mt-1 font-semibold text-[28px] tabular-nums leading-none tracking-tight">
            {formatToBRL(acceptance?.acceptedValue ?? data.agreedValue)}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {acceptance
              ? `${acceptance.acceptedName} · ${dateTime(acceptance.acceptedAt)}`
              : "Sem aceite gravado: o cliente ainda não confirmou pelo link."}
          </p>
          {acceptance && (
            <div className="mt-3 space-y-1 border-primary-foreground/25 border-t pt-2 text-xs opacity-80">
              <p>
                IP {acceptance.acceptedIp ?? "não registrado"} · valor em tela
                hoje {formatToBRL(data.agreedValue)}
              </p>
              {acceptance.userAgent && (
                <p className="break-words">{acceptance.userAgent}</p>
              )}
            </div>
          )}
        </div>

        {asking ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <Label htmlFor="review-reason">
              O que você quer que o cliente revise?
            </Label>
            <Textarea
              id="review-reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: conferir o bairro do salão e o horário de retirada."
              value={reason}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Este texto aparece para o cliente no link. A resposta de agora é
              arquivada como v{nextVersion} antes de liberar um novo envio —
              nada é apagado, e o link não muda.
            </p>
            <div className="flex items-center gap-2">
              <Button
                disabled={requestReview.isPending}
                onClick={() => void onAsk()}
                size="sm"
              >
                {requestReview.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                Arquivar e liberar novo envio
              </Button>
              <Button
                disabled={requestReview.isPending}
                onClick={() => setAsking(false)}
                size="sm"
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAsking(true)} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Pedir nova revisão
            </Button>
            <p className="text-muted-foreground text-xs">
              Congela esta resposta como histórico e devolve o formulário pelo
              mesmo link.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
