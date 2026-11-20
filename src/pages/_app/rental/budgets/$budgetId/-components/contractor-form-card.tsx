/**
 * Dados do contratante — o formulário de pré-preenchimento do escritório.
 *
 * Existe por um motivo simples: quase tudo aqui ele já sabe antes de o cliente
 * abrir o link (anotou o CNPJ no WhatsApp, copiou o e-mail do contrato). Sem
 * este card, o cliente digita tudo do zero e erra; com ele, a página pública
 * abre com o nome, o documento e o WhatsApp já escritos — `detailsToForm` lê o
 * mesmo registro que este card grava.
 *
 * **Tudo é opcional**, e não é só liberdade na tela: é a regra do backend.
 *  - campo vazio nunca é erro;
 *  - o que ele não mexe não é reenviado, então não há risco de apagar o lado
 *    PJ ao salvar o lado PF (e vice-versa);
 *  - o formato só é cobrado quando existe conteúdo — e aí a mensagem aparece
 *    antes de enviar, porque um CPF com dígito errado no cadastro é pior do
 *    que um campo em branco.
 *
 * Grava apenas nos dados ATIVOS do orçamento. O histórico de revisões
 * (`budget_event_revisions`) é outra coisa: a cópia congelada de cada envio
 * continua intocada, exatamente como foi respondida naquela hora.
 *
 * Os primitivos de campo vêm da página pública de propósito: mesma etiqueta,
 * mesma máscara, mesma validação (`utils/brDocuments`), então o que ele vê aqui
 * é literalmente o que o cliente vê lá.
 */
/** biome-ignore-all lint/complexity/noVoid: <explanation> */
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Info, Loader2, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBudgetEventDetailsQueryKey,
  useGetBudgetEventDetails,
  useUpdateBudgetEventContractor,
} from "@/http/generated";
import {
  Callout,
  Field,
  FieldError,
  Grid2,
  RadioCards,
  TextInput,
} from "@/pages/p/-components/public-ui";
import type { ContractorType } from "@/utils/brDocuments";
import {
  validarDocumento,
  validarEmail,
  validarWhatsapp,
} from "@/utils/brDocuments";
import { inputDocMask, inputPhoneMask } from "@/utils/inputMasks";

/**
 * Só o recorte do contratante, espelhando `GET /rental/budgets/:budgetId/event-details`.
 * À mão, como em `event-answer-card.tsx`: o card não depende do kubb para
 * compilar e um campo novo do formulário não quebra esta tela.
 */
type ContractorDto = {
  contractorType?: string | null;
  contractorName?: string | null;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
};
type EventDetailsLite = {
  submitted?: boolean;
  publicUrl?: string | null;
  details?: ContractorDto | null;
};
type Form = {
  type: ContractorType;
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
};
const TYPE_OPTIONS = [
  {
    hint: "Nome completo, CPF e WhatsApp.",
    id: "PF",
    label: "Pessoa física",
  },
  {
    hint: "Razão social, nome fantasia e CNPJ.",
    id: "PJ",
    label: "Pessoa jurídica",
  },
] as const;
/** Do banco para a tela: o registro guarda dígitos, a UI mostra máscara. */
const toForm = (dto?: ContractorDto | null): Form => ({
  document: inputDocMask(dto?.document ?? ""),
  email: dto?.email ?? "",
  name: dto?.contractorName ?? "",
  phone: inputPhoneMask(dto?.phone ?? ""),
  tradeName: dto?.tradeName ?? "",
  type: dto?.contractorType === "PJ" ? "PJ" : "PF",
});
const same = (a: Form, b: Form) => JSON.stringify(a) === JSON.stringify(b);
/** Erro por campo, calculado ao digitar — vazio nunca entra aqui. */
const problemsOf = (form: Form) => ({
  document:
    form.document.trim() && !validarDocumento(form.document, form.type)
      ? form.type === "PJ"
        ? "CNPJ inválido — são 14 dígitos com o dígito verificador."
        : "CPF inválido — são 11 dígitos com o dígito verificador."
      : null,
  email:
    form.email.trim() && !validarEmail(form.email)
      ? "E-mail inválido — falta o @ ou o domínio."
      : null,
  phone:
    form.phone.trim() && !validarWhatsapp(form.phone)
      ? "WhatsApp incompleto — DDD + número (10 ou 11 dígitos)."
      : null,
});
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
export function ContractorFormCard({ budgetId }: { budgetId: string }) {
  const detailsQuery = useGetBudgetEventDetails(budgetId);
  const update = useUpdateBudgetEventContractor();
  const queryClient = useQueryClient();
  const data = detailsQuery.data as EventDetailsLite | undefined;
  const server = toForm(data?.details);
  // `null` = "acompanha o servidor". Qualquer tecla passa a ter valor próprio,
  // e depois de salvar ele volta a seguir o que o banco respondeu.
  const [draft, setDraft] = useState<Form | null>(null);
  const [serverFields, setServerFields] = useState<string[]>([]);
  const form = draft ?? server;
  const dirty = draft !== null && !same(draft, server);
  const problems = problemsOf(form);
  const pj = form.type === "PJ";
  /** Marca o campo se a tela discorda OU se o back devolveu aquele campo. */
  const bad = (key: keyof typeof problems) =>
    Boolean(problems[key]) || serverFields.includes(key);
  const set = (key: Exclude<keyof Form, "type">, value: string) => {
    setServerFields([]);
    setDraft({ ...form, [key]: value });
  };
  // O tipo tem chave própria: `Form['type']` é literal, não string qualquer.
  const setType = (value: string) => {
    setServerFields([]);
    setDraft({ ...form, type: value === "PJ" ? "PJ" : "PF" });
  };
  const onSave = async () => {
    const blocking = Object.entries(problems).filter(([, message]) => message);
    if (blocking.length > 0) {
      toast.error("Confira os campos destacados antes de salvar.");
      return;
    }
    try {
      const response = await update.mutateAsync({
        budgetId,
        // Nome fantasia só viaja quando faz parte do cadastro aberto: omitir é
        // o que preserva a fantasia já gravada enquanto ele trabalha em PF.
        data: {
          document: form.document.trim(),
          email: form.email.trim(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(pj ? { tradeName: form.tradeName.trim() } : {}),
          type: form.type,
        },
      });
      const saved = (response as EventDetailsLite | undefined)?.details;
      setDraft(toForm(saved));
      setServerFields([]);
      toast.success(
        saved?.contractorName || saved?.document
          ? "Dados do contratante salvos no orçamento."
          : "Campos limpos.",
      );
      // Mantém o card de resposta do cliente (e a contagem de visitas) coerente
      // com o que acabou de ser gravado.
      await queryClient.invalidateQueries({
        queryKey: getBudgetEventDetailsQueryKey(budgetId),
      });
    } catch (error) {
      const payload = (
        error as { response?: { data?: { error?: string; fields?: string[] } } }
      )?.response?.data;
      if (payload?.fields?.length) {
        setServerFields(payload.fields);
        toast.error(payload.error ?? "Alguns campos têm formato inválido.");
        return;
      }
      setServerFields([]);
      toast.error("Não foi possível salvar agora.");
    }
  };
  const onReset = () => {
    setDraft(null);
    setServerFields([]);
  };
  if (detailsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do contratante</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar o cadastro. Recarregue a página.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {pj ? (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <UserRound className="h-4 w-4 text-muted-foreground" />
          )}
          Dados do contratante
          <Badge variant="outline">tudo opcional</Badge>
          {data?.submitted && (
            <Badge className="bg-emerald-500/10 text-emerald-600">
              respondido pelo cliente
            </Badge>
          )}
          {dirty && <Badge variant="secondary">alterações não salvas</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {detailsQuery.isLoading ? (
          <p className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando cadastro...
          </p>
        ) : (
          <>
            <Callout icon={<Info className="h-4 w-4" />}>
              <p>
                Nada aqui é obrigatório. O que você preencher já chega escrito
                na página do cliente — e ele pode conferir e mudar qualquer
                campo por lá.
              </p>
              <p className="text-muted-foreground text-xs">
                Salva só o que foi alterado: trocar PF por PJ não apaga os dados
                do outro tipo, e o histórico de revisões não é tocado.
              </p>
            </Callout>
            <Field label="Tipo de contratante">
              <RadioCards
                namePrefix={`contratante-${budgetId}`}
                onChange={setType}
                options={TYPE_OPTIONS}
                value={form.type}
              />
            </Field>
            <Field
              htmlFor={`contratante-${budgetId}-nome`}
              label={pj ? "Razão social" : "Nome completo"}
              optional
            >
              <TextInput
                id={`contratante-${budgetId}-nome`}
                maxLength={120}
                onChange={(value) => set("name", value)}
                placeholder={pj ? "Nome da empresa" : "Nome e sobrenome"}
                value={form.name}
              />
            </Field>
            {pj && (
              <Field
                htmlFor={`contratante-${budgetId}-fantasia`}
                label="Nome fantasia"
                optional
              >
                <TextInput
                  id={`contratante-${budgetId}-fantasia`}
                  maxLength={120}
                  onChange={(value) => set("tradeName", value)}
                  placeholder="Como o cliente costuma chamar"
                  value={form.tradeName}
                />
              </Field>
            )}
            <Grid2>
              <Field
                error={bad("document")}
                htmlFor={`contratante-${budgetId}-documento`}
                label={pj ? "CNPJ" : "CPF"}
                optional
              >
                <TextInput
                  id={`contratante-${budgetId}-documento`}
                  inputMode="numeric"
                  invalid={bad("document")}
                  maxLength={pj ? 18 : 14}
                  onChange={(value) => set("document", inputDocMask(value))}
                  placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"}
                  value={form.document}
                />
                <FieldError
                  message={
                    problems.document ?? "Não confere com o tipo informado."
                  }
                  show={bad("document")}
                />
              </Field>
              <Field
                error={bad("phone")}
                htmlFor={`contratante-${budgetId}-whatsapp`}
                label="WhatsApp"
                optional
              >
                <TextInput
                  id={`contratante-${budgetId}-whatsapp`}
                  inputMode="tel"
                  invalid={bad("phone")}
                  maxLength={20}
                  onChange={(value) => set("phone", inputPhoneMask(value))}
                  placeholder="(49) 99999-9999"
                  value={form.phone}
                />
                <FieldError
                  message={problems.phone ?? "Número incompleto."}
                  show={bad("phone")}
                />
              </Field>
            </Grid2>
            <Field
              error={bad("email")}
              htmlFor={`contratante-${budgetId}-email`}
              label="E-mail"
              optional
            >
              <TextInput
                id={`contratante-${budgetId}-email`}
                inputMode="email"
                invalid={bad("email")}
                maxLength={160}
                onChange={(value) => set("email", value)}
                placeholder="cliente@email.com"
                value={form.email}
              />
              <FieldError
                message={problems.email ?? "E-mail inválido."}
                show={bad("email")}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                disabled={!dirty || update.isPending}
                onClick={onSave}
                size="sm"
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar contratante
              </Button>
              {dirty && (
                <Button
                  disabled={update.isPending}
                  onClick={onReset}
                  variant="ghost"
                >
                  Descartar
                </Button>
              )}
              <span className="text-muted-foreground text-xs">
                {data?.publicUrl
                  ? "Vai preenchido no link do cliente."
                  : "Gere o link para o cliente receber preenchido."}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
