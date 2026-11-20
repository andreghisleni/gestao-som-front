/**
 * Comparação entre duas respostas do formulário.
 *
 * A tela interna recebe cópias congeladas (`revisions`) e a cópia de trabalho
 * (`details`), todas no mesmo formato do DTO público. Este arquivo transforma
 * qualquer par delas na lista "o que mudou", com etiqueta legível e valor já
 * apresentado como o cliente viu — nada de CPF sem máscara no meio da
 * comparação.
 */
import type { FormState } from "./-form";
import type { FormOptionsDto, Option } from "./-types";

export type DiffLine = {
  group: string;
  label: string;
  before: string;
  after: string;
};

/** Id → etiqueta, com o mesmo fallback da tela pública (mostra o próprio id). */
const labelOf = (options: Option[] | undefined, id: string): string =>
  id ? (options?.find((option) => option.id === id)?.label ?? id) : "";

const listOf = (ids: string[], options: Option[] | undefined): string =>
  ids.map((id) => labelOf(options, id)).join(" · ");

type Field = {
  group: "Você" | "Local" | "Horários" | "Detalhes";
  label: string;
  get: (form: FormState, options?: FormOptionsDto) => string;
};

/**
 * Ordem dos grupos = ordem da tela de revisão. Campo que ficou vazio nas duas
 * respostas não entra na lista: `diffAnswers` só devolve o que mudou de fato.
 */
const FIELDS: Field[] = [
  {
    group: "Você",
    label: "Tipo de contratante",
    get: (f) =>
      f.contractorType === "PJ" ? "Pessoa jurídica" : "Pessoa física",
  },
  { group: "Você", label: "Nome / razão social", get: (f) => f.name },
  { group: "Você", label: "Nome fantasia", get: (f) => f.tradeName },
  { group: "Você", label: "CPF / CNPJ", get: (f) => f.document },
  { group: "Você", label: "E-mail", get: (f) => f.email },
  { group: "Você", label: "WhatsApp", get: (f) => f.phone },

  { group: "Local", label: "Nome do local", get: (f) => f.venueName },
  { group: "Local", label: "Logradouro", get: (f) => f.street },
  { group: "Local", label: "Número", get: (f) => f.streetNumber },
  { group: "Local", label: "Bairro", get: (f) => f.district },
  { group: "Local", label: "Cidade", get: (f) => f.city },
  { group: "Local", label: "UF", get: (f) => f.state },
  { group: "Local", label: "Complemento", get: (f) => f.complement },
  { group: "Local", label: "Ponto de referência", get: (f) => f.reference },
  { group: "Local", label: "CEP", get: (f) => f.zipCode },
  {
    group: "Local",
    label: "Internet",
    get: (f, options) =>
      labelOf(options?.internetAvailability, f.internetAvailable),
  },
  { group: "Local", label: "Sobre a internet", get: (f) => f.internetDetail },
  {
    group: "Local",
    label: "Energia",
    get: (f, options) => labelOf(options?.powerSupply, f.powerSupply),
  },
  {
    group: "Local",
    label: "Espaço",
    get: (f, options) => labelOf(options?.venueSizes, f.venueSize),
  },
  {
    group: "Local",
    label: "Acesso e montagem",
    get: (f, options) => listOf(f.accessNotes, options?.accessNotes),
  },

  { group: "Horários", label: "Montagem", get: (f) => f.setupTime },
  { group: "Horários", label: "Início", get: (f) => f.startTime },
  { group: "Horários", label: "Fim", get: (f) => f.endTime },
  {
    group: "Horários",
    label: "Termina no dia seguinte",
    get: (f) => (f.endsNextDay ? "Sim" : "Não"),
  },
  { group: "Horários", label: "Retirada", get: (f) => f.pickupTime },
  {
    group: "Horários",
    label: "Flexibilidade de início",
    get: (f, options) =>
      labelOf(options?.startsFlexibility, f.startsFlexibility),
  },
  {
    group: "Horários",
    label: "Contato no local",
    get: (f) => f.onSiteContactName,
  },
  {
    group: "Horários",
    label: "Telefone do contato",
    get: (f) => f.onSiteContactPhone,
  },

  {
    group: "Detalhes",
    label: "Tipo de evento",
    get: (f, options) => labelOf(options?.eventTypes, f.eventType),
  },
  {
    group: "Detalhes",
    label: "Público",
    get: (f) => (f.guestCount ? `${f.guestCount} pessoas` : ""),
  },
  {
    group: "Detalhes",
    label: "Estilos musicais",
    get: (f, options) => listOf(f.musicStyles, options?.musicStyles),
  },
  { group: "Detalhes", label: "Outro estilo", get: (f) => f.musicStyleOther },
  {
    group: "Detalhes",
    label: "Extras pedidos",
    get: (f, options) => listOf(f.requestedExtras, options?.requestedExtras),
  },
  { group: "Detalhes", label: "Observações", get: (f) => f.notes },
];

/** `before` = resposta mais antiga; `after` = mais recente. */
export function diffAnswers(
  before: FormState,
  after: FormState,
  options?: FormOptionsDto,
): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const field of FIELDS) {
    const previous = (field.get(before, options) ?? "").trim();
    const current = (field.get(after, options) ?? "").trim();
    if (previous === current) {
      continue;
    }
    lines.push({
      group: field.group,
      label: field.label,
      before: previous,
      after: current,
    });
  }
  return lines;
}

/** Os grupos que realmente têm mudança, na ordem da tela de revisão. */
export function groupDiff(lines: DiffLine[]): [string, DiffLine[]][] {
  const order = ["Você", "Local", "Horários", "Detalhes"];
  const buckets = new Map<string, DiffLine[]>();
  for (const line of lines) {
    const list = buckets.get(line.group) ?? [];
    list.push(line);
    buckets.set(line.group, list);
  }
  return order
    .filter((group) => (buckets.get(group)?.length ?? 0) > 0)
    .map((group) => [group, buckets.get(group) as DiffLine[]]);
}
