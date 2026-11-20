/**
 * Os dados do recibo, separados do desenho do PDF.
 *
 * Fica num arquivo próprio por um motivo prático: é a parte que o dialog usa
 * para preencher os campos antes de o usuário clicar em "Gerar", e ela não
 * precisa (nem deve) arrastar o `@react-pdf/renderer` — que só é carregado
 * sob demanda no `receipt-document.tsx`. Assim o bundle inicial da aplicação
 * não cresce com a biblioteca de PDF.
 *
 * Cada campo aqui já é texto pronto para o papel, porque o que ele revisa no
 * dialog é exatamente o que sai no PDF: não há formatação escondida depois.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarDocumento } from "@/utils/brDocuments";

/** Frase do modelo, usada quando o orçamento não tem equipamento categorizado. */
const SERVICO_PADRAO = "som, luz e vídeo";

/**
 * Tudo que aparece no papel, já em texto pronto. Os campos de data/valor do
 * formulário viram string aqui para o documento não saber nada de máscara.
 */
export type ReceiptData = {
  issuerName: string;
  issuerCpf: string;
  payerName: string;
  /** "CPF" | "CNPJ" | "" (vazio = não menciona documento no parágrafo 1). */
  payerDocLabel: string;
  payerDoc: string;
  amount: number;
  /** complemento de "equipamentos de ...": "som, luz e vídeo". */
  service: string;
  /** "Jordise (acampamento)". */
  eventLine: string;
  /** "realizado no sábado e domingo, dias 15 e 16 de agosto de 2026" ("" = omite). */
  period: string;
  /** "Chapecó - SC". */
  cityState: string;
  /** "21 de agosto de 2026". */
  issueDate: string;
};

/** Recorte do orçamento: só o que o recibo lê, como no card do chunk 8. */
export type ReceiptBudget = {
  clientName: string;
  eventDate: string | number | Date;
  totalValue?: number;
  finalValue?: number;
  sections?: {
    items?: { equipment?: { category?: { name?: string } } }[];
  }[];
};

/** Recorte de `GET /rental/budgets/:budgetId/event-details`. */
export type ReceiptEvent = {
  clientName?: string;
  agreedValue?: number;
  details?: {
    contractorType?: string | null;
    contractorName?: string | null;
    document?: string | null;
    city?: string | null;
    state?: string | null;
    eventType?: string | null;
    endsNextDay?: boolean | null;
  } | null;
};

/** 1 -> "1º", 15 -> "15" (o modelo escreve "dias 15 e 16"). */
function diaDoMes(date: Date): string {
  const day = format(date, "d");
  return day === "1" ? "1º" : day;
}

/** "sábado e domingo, dias 15 e 16 de agosto de 2026", com o "no/dia" na frente. */
export function montarPeriodo(
  eventDate: ReceiptBudget["eventDate"],
  endsNextDay?: boolean | null,
): string {
  const start = new Date(eventDate);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  const weekday = (date: Date) => format(date, "EEEE", { locale: ptBR });

  if (!endsNextDay) {
    return `realizado no ${weekday(start)}, dia ${diaDoMes(start)} de ${format(start, "MMMM", { locale: ptBR })} de ${format(start, "yyyy")}`;
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const mesmaSemanaMes = format(start, "MMyyyy") === format(end, "MMyyyy");
  const dias = mesmaSemanaMes
    ? `${diaDoMes(start)} e ${diaDoMes(end)} de ${format(end, "MMMM", { locale: ptBR })} de ${format(end, "yyyy")}`
    : `${diaDoMes(start)} de ${format(start, "MMMM", { locale: ptBR })} de ${format(start, "yyyy")} e ${diaDoMes(end)} de ${format(end, "MMMM", { locale: ptBR })} de ${format(end, "yyyy")}`;
  return `realizado no ${weekday(start)} e ${weekday(end)}, dias ${dias}`;
}

/** "som, luz e vídeo" a partir das categorias dos equipamentos do orçamento. */
export function montarServico(budget: ReceiptBudget): string {
  const nomes: string[] = [];
  for (const section of budget.sections ?? []) {
    for (const item of section.items ?? []) {
      const nome = item.equipment?.category?.name?.trim().toLowerCase();
      if (nome && !nomes.includes(nome)) {
        nomes.push(nome);
      }
    }
  }
  if (nomes.length === 0) {
    return SERVICO_PADRAO;
  }
  if (nomes.length === 1) {
    return nomes[0] as string;
  }
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/**
 * Defaults do recibo com o que o sistema já sabe. Nada aqui é gravado: é só a
 * primeira pintura do formulário, que você revisa campo por campo antes de
 * baixar o PDF.
 */
export function buildReceiptData({
  budget,
  event,
  sessionUserName,
  issuer,
  eventTypeLabel,
}: {
  budget: ReceiptBudget;
  event?: ReceiptEvent | null;
  sessionUserName?: string | null;
  /** Última emissão lembrada no navegador (nome/CPF/cidade do emitente). */
  issuer?: { name?: string; cpf?: string; cityState?: string } | null;
  /**
   * Etiqueta legível do `details.eventType`, que no banco é um id
   * ("festa_karaoke"). O recibo é um documento: sai o rótulo, nunca a chave.
   */
  eventTypeLabel?: string;
}): ReceiptData {
  const details = event?.details ?? null;
  const payerName =
    details?.contractorName?.trim() ||
    event?.clientName?.trim() ||
    budget.clientName;
  const payerDoc = formatarDocumento(details?.document);
  const cityState = [
    details?.city?.trim(),
    details?.state?.trim().toUpperCase(),
  ]
    .filter(Boolean)
    .join(" - ");

  return {
    issuerName: sessionUserName?.trim() || issuer?.name || "",
    issuerCpf: issuer?.cpf || "",
    payerName,
    payerDocLabel: payerDoc
      ? details?.contractorType === "PJ"
        ? "CNPJ"
        : "CPF"
      : "",
    payerDoc,
    amount: Number(
      event?.agreedValue ?? budget.finalValue ?? budget.totalValue ?? 0,
    ),
    service: montarServico(budget),
    eventLine: details?.eventType
      ? `${budget.clientName} (${eventTypeLabel ?? details.eventType})`
      : budget.clientName,
    period: montarPeriodo(budget.eventDate, details?.endsNextDay),
    cityState: cityState || issuer?.cityState || "",
    issueDate: format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
  };
}
