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
import { differenceInMinutes, format } from "date-fns";
import {
  Archive,
  ClipboardList,
  Eye,
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

/** Linha de `viewing.byDevice`: um visitante (aparelho + IP) do link. */
type ViewDeviceDto = {
  device: string;
  views: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

/** Resumo de visitas: a unidade é visita, não request. */
type ViewingDto = {
  visits: number;
  devices: number;
  trackedVisits: number;
  windowMinutes: number;
  firstViewAt: string | null;
  lastViewAt: string | null;
  byDevice: ViewDeviceDto[];
};

/** "agora", "há 12 min", "há 3 h", "ontem às 14:03", "20/11 às 09:12". */
/** "agora", "há 12 min", "há 3 h", "ontem às 14:03", "20/11 às 09:12". */

type EventDetailsDto = {
  budgetId: string;
  status: string;
  clientName: string;
  eventDate: string;
  agreedValue: number;
  protocol: string | null;
  publicUrl: string | null;
  publicViewCount: number;
  /** Visitas rastreadas pelo back; ausente enquanto o hook for antigo. */
  viewing?: ViewingDto;
  submitted: boolean;
  durationMinutes: number | null;
  details: PublicDetailsDto | null;
  acceptance: AcceptanceDto | null;
  openReview: RevisionDto | null;
  revisions: RevisionDto[];
};

/** "agora", "há 12 min", "há 3 h", "ontem às 14:03", "20/11 às 09:12". */
/** "agora", "há 12 min", "há 3 h", "ontem às 14:03", "20/11 às 09:12". */
const agoLabel = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  const minutes = differenceInMinutes(new Date(), date);
  if (minutes < 1) {
    return "agora";
  }
  if (minutes < 60) {
    return `há ${minutes} min`;
  }
  if (minutes < 24 * 60) {
    return `há ${Math.round(minutes / 60)} h`;
  }
  if (minutes < 48 * 60) {
    return `ontem às ${format(date, "HH:mm")}`;
  }
  return format(date, "dd/MM 'às' HH:mm");
};

const visitWord = (count: number): string =>
  count === 1 ? "1 visita" : `${count} visitas`;

type DeviceGroup = ViewDeviceDto & { visitors: number };

/**
 * Dois celulares iguais abrem o mesmo link: são dois visitantes, mas uma linha
 * só na tela ("iPhone · Safari — 4 visitas · 2 aparelhos").
 */
const groupViews = (rows: ViewDeviceDto[]): DeviceGroup[] => {
  const map = new Map<string, DeviceGroup>();
  for (const row of rows) {
    const current = map.get(row.device);
    if (!current) {
      map.set(row.device, { ...row, visitors: 1 });
      continue;
    }
    current.visitors += 1;
    current.views += row.views;
    if (new Date(row.lastSeenAt) > new Date(current.lastSeenAt)) {
      current.lastSeenAt = row.lastSeenAt;
    }
    if (new Date(row.firstSeenAt) < new Date(current.firstSeenAt)) {
      current.firstSeenAt = row.firstSeenAt;
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  );
};

/** Resposta (viva ou congelada) → estado do formulário, com as máscaras. */

/**
 * "O cliente abriu?" — quantas visitas, de quantos aparelhos e quando.
 *
 * A unidade é visita, não request: com a janela do back
 * (`PUBLIC_VIEW_WINDOW_MINUTES`, 30 min por padrão), recarga, retorno para a
 * aba, retry de 4G e preview de link de robô não somam visita nova.
 */

/**
 * "O cliente abriu?" — quantas visitas, de quantos aparelhos e quando.
 *
 * A unidade é visita, não request: com a janela do back
 * (`PUBLIC_VIEW_WINDOW_MINUTES`, 30 min por padrão), recarga, retorno para a
 * aba, retry de 4G e preview de link de robô não somam visita nova.
 */
function ViewingSummary({ viewing }: { viewing: ViewingDto }) {
  const groups = groupViews(viewing.byDevice);
  // Link criado antes desta contagem: o total antigo vale, o detalhe começa agora.
  const legacy = viewing.trackedVisits < viewing.visits;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{visitWord(viewing.visits)}</span>
        {viewing.devices > 0 ? (
          <span className="text-muted-foreground">
            ·{" "}
            {viewing.devices === 1
              ? "1 aparelho"
              : `${viewing.devices} aparelhos`}
            {viewing.lastViewAt
              ? ` · última ${agoLabel(viewing.lastViewAt)}`
              : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">
            · nenhuma abertura registrada desde que o link existe
          </span>
        )}
      </div>

      {groups.length > 0 && (
        <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
          {groups.map((group) => (
            <li className="flex flex-wrap gap-x-2" key={group.device}>
              <span className="text-foreground">{group.device}</span>
              <span>{visitWord(group.views)}</span>
              {group.visitors > 1 && <span>· {group.visitors} aparelhos</span>}
              <span>· primeira {agoLabel(group.firstSeenAt)}</span>
              <span>· última {agoLabel(group.lastSeenAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
        Recarregar dentro de {viewing.windowMinutes} min não conta como visita
        nova, e preview de link (WhatsApp, robôs) não entra na conta.
        {legacy
          ? " O total anterior a essa regra foi preservado; o detalhe por aparelho começa daqui."
          : ""}
      </p>
    </div>
  );
}

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
                (data.viewing?.visits ?? 0) > 0
                  ? ` e teve ${data.viewing?.visits} visita(s)`
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
        {data.viewing && <ViewingSummary viewing={data.viewing} />}

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
