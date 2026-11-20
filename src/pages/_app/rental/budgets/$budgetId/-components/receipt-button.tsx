/**
 * Botão "Recibo (PDF)" no cabeçalho do orçamento.
 *
 * Fluxo: abre o dialog já preenchido com o que o sistema sabe (valor acordado,
 * contratante + documento do chunk 8, categorias dos equipamentos, data do
 * evento, cidade do local), você revisa/troca qualquer campo, e o PDF é gerado
 * no navegador e baixado — sem rota nova no back, sem serviço de e-mail, sem
 * pré-visualização em outra aba. É o "caminho 2": `@react-pdf/renderer` com
 * download direto.
 *
 * Três decisões que vale você confirmar:
 *  1. O emitente (seu nome, seu CPF, a cidade de emissão) não existe no banco.
 *     O nome vem da sua conta logada; CPF e cidade ficam vazios na primeira
 *     vez e depois são lembrados no navegador (`localStorage`), por aparelho.
 *     Se preferir um padrão gravado para todo canto, é uma constante à mão.
 *  2. Nada do recibo é salvo no orçamento: o PDF é um documento à parte, e o
 *     histórico do formulário continua intocado.
 *  3. O documento do contratante só entra na frase quando existe; sem ele, o
 *     parágrafo fica exatamente como no modelo.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FileDown } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  type GetBudgetEventDetails200,
  useGetBudgetEventDetails,
  useGetEventFormOptions,
} from "@/http/generated";
import { auth } from "@/lib/auth";
import { formatarDocumento, onlyDigits } from "@/utils/brDocuments";
import { formatToBRL } from "@/utils/formatToBRL";
import { inputDocMask } from "@/utils/inputMasks";
import { valorPorExtenso } from "@/utils/valorPorExtenso";
import {
  buildReceiptData,
  type ReceiptBudget,
  type ReceiptData,
} from "./receipt-model";

/** Último emitente usado, lembrado por navegador. */
const ISSUER_STORAGE_KEY = "vortex:recibo:emitente";

type IssuerPrefs = { name?: string; cpf?: string; cityState?: string };

function readIssuerPrefs(): IssuerPrefs {
  try {
    return JSON.parse(
      localStorage.getItem(ISSUER_STORAGE_KEY) ?? "{}",
    ) as IssuerPrefs;
  } catch {
    return {};
  }
}

function writeIssuerPrefs(data: ReceiptData) {
  try {
    localStorage.setItem(
      ISSUER_STORAGE_KEY,
      JSON.stringify({
        name: data.issuerName,
        cpf: data.issuerCpf,
        cityState: data.cityState,
      }),
    );
  } catch {
    // Navegador em modo privado: o recibo sai igual, só não fica lembrado.
  }
}

/** 14 dígitos = CNPJ, 11 = CPF; qualquer outra coisa não entra na frase. */
function rotuloDocumento(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 14) {
    return "CNPJ";
  }
  if (digits.length === 11) {
    return "CPF";
  }
  return "";
}

/** Nome de arquivo seguro no Windows/Linux. */
function nomeDoArquivo(data: ReceiptData): string {
  const limpo = (value: string) =>
    value
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const cliente = limpo(data.payerName) || "contratante";
  return `Recibo - ${cliente} - ${format(new Date(), "dd-MM-yyyy")}.pdf`;
}

const receiptSchema = z.object({
  issuerName: z.string().min(1, "Informe quem emite o recibo"),
  issuerCpf: z.string().optional(),
  cityState: z.string().optional(),
  issueDate: z.string().min(1, "Informe a data de emissão"),
  payerName: z.string().min(1, "Informe quem pagou"),
  payerDoc: z.string().optional(),
  amount: z.coerce.number().min(0, "Valor inválido"),
  service: z.string().min(1, "Descreva os equipamentos"),
  eventLine: z.string().min(1, "Informe o evento"),
  period: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

interface ReceiptButtonProps {
  budget: ReceiptBudget;
  budgetId: string;
}

export function ReceiptButton({ budget, budgetId }: ReceiptButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: session } = auth.useSession();
  const { data: event } = useGetBudgetEventDetails(budgetId);
  // Catálogo de opções do formulário público: é dele a etiqueta "Casamento",
  // porque o que fica gravado no orçamento é a chave "casamento".
  const { data: formOptions } = useGetEventFormOptions();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      issuerName: "",
      issuerCpf: "",
      cityState: "",
      issueDate: "",
      payerName: "",
      payerDoc: "",
      amount: 0,
      service: "",
      eventLine: "",
      period: "",
    },
  });

  // O recibo é montado com os dados que já estão na tela; reabrir o dialog
  // depois de mexer no orçamento refaz a pintura, e o que ele digitou fica só
  // naquela emissão.
  useEffect(() => {
    if (!open) {
      return;
    }
    const defaults = buildReceiptDefaults({
      budget,
      event,
      sessionUserName: session?.user?.name,
      eventTypeLabel: etiquetaTipoEvento(
        formOptions?.eventTypes,
        event?.details?.eventType,
      ),
    });
    form.reset(defaults);
  }, [open, budget, event, formOptions, session?.user?.name, form]);

  const watchedAmount = form.watch("amount");
  const watchedDoc = form.watch("payerDoc");
  const docLabel = rotuloDocumento(String(watchedDoc ?? ""));

  async function onSubmit(values: ReceiptFormValues) {
    setIsDownloading(true);
    try {
      const data: ReceiptData = {
        issuerName: values.issuerName.trim(),
        issuerCpf: values.issuerCpf?.trim() ?? "",
        payerName: values.payerName.trim(),
        payerDocLabel: rotuloDocumento(values.payerDoc ?? ""),
        payerDoc: formatarDocumento(values.payerDoc),
        amount: Number(values.amount),
        service: values.service.trim(),
        eventLine: values.eventLine.trim(),
        period: values.period?.trim() ?? "",
        cityState: values.cityState?.trim() ?? "",
        issueDate: values.issueDate.trim(),
      };

      // Import tardio: o @react-pdf (~centenas de kB) só desce quando o
      // usuário realmente pede um recibo.
      const { renderReceiptBlob } = await import("./receipt-document");
      const blob = await renderReceiptBlob(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeDoArquivo(data);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);

      writeIssuerPrefs(data);
      setOpen(false);
      toast.success("Recibo gerado", {
        description: link.download,
      });
    } catch (error) {
      toast.error("Não foi possível gerar o recibo", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Recibo (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recibo de aluguel de equipamentos</DialogTitle>
          <DialogDescription>
            Os campos já vêm preenchidos com o que o sistema sabe. Ajuste o que
            for do papel e baixe o PDF — nada aqui é gravado no orçamento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* O dialog tem dez campos: com altura limitada ele rola dentro de
                si, e o botão de baixar continua sempre visível embaixo. */}
            <div className="-mr-1 max-h-[62vh] space-y-4 overflow-y-auto pr-1">
              <ReceiptSection title="Quem emite">
                <ReceiptField
                  form={form}
                  label="Nome / razão social do emitente"
                  name="issuerName"
                />
                <ReceiptField
                  form={form}
                  label="CPF do emitente"
                  mask="doc"
                  name="issuerCpf"
                  placeholder="000.000.000-00"
                />
                <ReceiptField
                  form={form}
                  label="Cidade - UF"
                  name="cityState"
                  placeholder="Chapecó - SC"
                />
                <ReceiptField
                  form={form}
                  label="Data de emissão"
                  name="issueDate"
                />
              </ReceiptSection>

              <ReceiptSection title="Quem pagou">
                <ReceiptField
                  form={form}
                  label="Contratante (quem pagou)"
                  name="payerName"
                />
                <ReceiptField
                  form={form}
                  label={
                    docLabel
                      ? `${docLabel} do contratante`
                      : "Documento do contratante (CPF/CNPJ)"
                  }
                  mask="doc"
                  name="payerDoc"
                  placeholder="opcional"
                />
              </ReceiptSection>

              <ReceiptSection title="O serviço">
                <ReceiptField
                  form={form}
                  hint={
                    Number.isFinite(Number(watchedAmount))
                      ? `${formatToBRL(Number(watchedAmount) || 0)} (${valorPorExtenso(Number(watchedAmount))})`
                      : undefined
                  }
                  label="Valor recebido (R$)"
                  name="amount"
                  type="number"
                />
                <ReceiptField
                  className="sm:col-span-2"
                  form={form}
                  label="Equipamentos (o que foi alugado)"
                  name="service"
                />
                <ReceiptField form={form} label="Evento" name="eventLine" />
                <ReceiptField
                  form={form}
                  label="Período do evento"
                  name="period"
                />
              </ReceiptSection>
            </div>

            <DialogFooter>
              <Button disabled={isDownloading} type="submit" variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                {isDownloading ? "Gerando…" : "Gerar e baixar PDF"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Divide o form em blocos de três, na ordem do papel. */
function ReceiptSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap font-semibold text-muted-foreground text-xs uppercase">
          {title}
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

type ReceiptFieldProps = {
  form: UseFormReturn<ReceiptFormValues>;
  label: string;
  name: FieldPath<ReceiptFormValues>;
  hint?: string;
  mask?: "doc";
  placeholder?: string;
  className?: string;
  type?: string;
};

function ReceiptField({
  className,
  form,
  hint,
  label,
  mask,
  name,
  placeholder,
  type = "text",
}: ReceiptFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-muted-foreground text-xs">
            {label}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              type={type}
              {...field}
              onChange={(event) =>
                field.onChange(
                  mask === "doc"
                    ? inputDocMask(event.target.value)
                    : event.target.value,
                )
              }
            />
          </FormControl>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Id do catálogo -> rótulo legível; sem catálogo, "festa_karaoke" vira "festa karaoke". */
function etiquetaTipoEvento(
  eventTypes: { id: string; label: string }[] | undefined,
  eventType?: string | null,
): string | undefined {
  if (!eventType) {
    return;
  }
  const found = eventTypes?.find((option) => option.id === eventType);
  if (found) {
    return found.label;
  }
  return eventTypes?.length ? eventType : eventType.replace(/_/g, " ");
}

/**
 * Defaults lidos do orçamento + resposta do formulário. A resposta do
 * formulário público pode ser nula (link nunca aberto), então cada campo tem
 * um fallback e o dialog continua editável.
 */
function buildReceiptDefaults({
  budget,
  event,
  sessionUserName,
  eventTypeLabel,
}: {
  budget: ReceiptBudget;
  event?: GetBudgetEventDetails200 | null;
  sessionUserName?: string;
  eventTypeLabel?: string;
}): ReceiptFormValues {
  const data = buildReceiptData({
    budget,
    event,
    sessionUserName,
    issuer: readIssuerPrefs(),
    eventTypeLabel,
  });
  return {
    issuerName: data.issuerName,
    issuerCpf: data.issuerCpf,
    cityState: data.cityState,
    issueDate: data.issueDate,
    payerName: data.payerName,
    payerDoc: data.payerDoc,
    amount: data.amount,
    service: data.service,
    eventLine: data.eventLine,
    period: data.period,
  };
}
