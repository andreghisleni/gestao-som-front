/**
 * A tela de revisão — em um componente só.
 *
 * É exatamente o "Confira antes de enviar" da página pública, agora reaproveitado
 * na tela interna do orçamento: quem confere por dentro vê os mesmos blocos, na
 * mesma ordem e com as mesmas etiquetas de quem confere por fora. A única
 * diferença é o botão "Editar", que só existe quando `onEdit` é passado — sem
 * ele a tela fica somente leitura, como deve ser uma resposta já recebida.
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */
import { Wifi } from "lucide-react";
import type { FormState } from "../-form";
import type { FormOptionsDto, Option } from "../-types";
import { ReviewBlock, ReviewLine } from "./public-ui";

/** Id → etiqueta legível; sem catálogo carregado, mostra o próprio id. */
export function labelOf(
  options: Option[] | undefined,
  id: string | null,
): string {
  if (!id) {
    return "—";
  }
  return options?.find((option) => option.id === id)?.label ?? id;
}

/** Uma linha de endereço legível de um só fôlego. */
export function addressLine(form: FormState): string {
  const head = `${form.street}, ${form.streetNumber}`;
  const tail = form.complement ? ` — ${form.complement}` : "";
  return `${head}${tail} · ${form.district} · ${form.city}/${form.state}`;
}

type Props = {
  form: FormState;
  options: FormOptionsDto | undefined;
  /** Passa quando quem lê pode corrigir (página pública). Omite = leitura. */
  onEdit?: (step: number) => void;
};

export function AnswerReview({ form, options, onEdit }: Props) {
  const pj = form.contractorType === "PJ";

  return (
    <div className="space-y-4">
      <ReviewBlock
        onEdit={onEdit ? () => onEdit(1) : undefined}
        title="Quem está contratando"
      >
        <ReviewLine
          label={pj ? "Razão social" : "Nome"}
          value={form.name || "não informado"}
        />
        {pj && <ReviewLine label="Nome fantasia" value={form.tradeName} />}
        <ReviewLine label={pj ? "CNPJ" : "CPF"} value={form.document} />
        <ReviewLine label="E-mail" value={form.email} />
        <ReviewLine label="WhatsApp" value={form.phone} />
      </ReviewBlock>

      <ReviewBlock
        onEdit={onEdit ? () => onEdit(2) : undefined}
        title="Local do evento"
      >
        <ReviewLine label="Nome do local" value={form.venueName} />
        <ReviewLine
          label="Endereço"
          value={form.street ? addressLine(form) : "não informado"}
        />
        <ReviewLine label="CEP" value={form.zipCode} />
        <ReviewLine
          label="Internet"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
              {labelOf(
                options?.internetAvailability,
                form.internetAvailable || null,
              )}
            </span>
          }
        />
        {form.internetDetail && (
          <ReviewLine label="Sobre a internet" value={form.internetDetail} />
        )}
        <ReviewLine
          label="Energia"
          value={labelOf(options?.powerSupply, form.powerSupply || null)}
        />
        <ReviewLine
          label="Espaço"
          value={labelOf(options?.venueSizes, form.venueSize || null)}
        />
        {form.accessNotes.length > 0 && (
          <ReviewLine
            label="Acesso e montagem"
            value={form.accessNotes
              .map((id) => labelOf(options?.accessNotes, id))
              .join(" · ")}
          />
        )}
      </ReviewBlock>

      <ReviewBlock
        onEdit={onEdit ? () => onEdit(3) : undefined}
        title="Horários"
      >
        <ReviewLine
          label="Montagem"
          value={form.setupTime || "não informado"}
        />
        <ReviewLine label="Início" value={form.startTime || "não informado"} />
        <ReviewLine
          label="Fim"
          value={
            form.endTime
              ? `${form.endTime}${form.endsNextDay ? " (dia seguinte)" : ""}`
              : "não informado"
          }
        />
        <ReviewLine
          label="Duração"
          value={
            form.startTime && form.endTime
              ? durationLabel(form)
              : form.endTime
                ? "—"
                : "não informado"
          }
        />
        {form.pickupTime && (
          <ReviewLine label="Retirada" value={form.pickupTime} />
        )}
        {form.startsFlexibility && (
          <ReviewLine
            label="Flexibilidade"
            value={labelOf(options?.startsFlexibility, form.startsFlexibility)}
          />
        )}
        {form.onSiteContactName && (
          <ReviewLine
            label="Contato no local"
            value={`${form.onSiteContactName}${form.onSiteContactPhone ? ` · ${form.onSiteContactPhone}` : ""}`}
          />
        )}
      </ReviewBlock>

      <ReviewBlock
        onEdit={onEdit ? () => onEdit(4) : undefined}
        title="Detalhes do evento"
      >
        <ReviewLine
          label="Tipo"
          value={labelOf(options?.eventTypes, form.eventType || null)}
        />
        <ReviewLine
          label="Público"
          value={form.guestCount ? `${form.guestCount} pessoas` : "—"}
        />
        <ReviewLine
          label="Estilos"
          value={
            form.musicStyles.length
              ? `${form.musicStyles
                  .map((id) => labelOf(options?.musicStyles, id))
                  .join(
                    ", ",
                  )}${form.musicStyleOther ? ` · ${form.musicStyleOther}` : ""}`
              : "não informado"
          }
        />
        {form.requestedExtras.length > 0 && (
          <ReviewLine
            label="Extras"
            value={form.requestedExtras
              .map((id) => labelOf(options?.requestedExtras, id))
              .join(" · ")}
          />
        )}
        {form.notes && <ReviewLine label="Observações" value={form.notes} />}
      </ReviewBlock>
    </div>
  );
}

/** Duração a partir do próprio formulário, com a virada de dia já resolvida. */
function durationLabel(form: FormState): string {
  const start = toMinutes(form.startTime);
  const end = toMinutes(form.endTime);
  if (start == null || end == null) {
    return "—";
  }
  const adjusted = form.endsNextDay ? end + 1440 : end;
  if (adjusted <= start) {
    return "—";
  }
  const total = adjusted - start;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) {
    return `${minutes} min`;
  }
  return minutes ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}
