/**
 * Corpo das etapas da página pública, na ordem e no formato do protótipo
 * (`pagina-publica-proto.html`): cada etapa é um cartão com título, descrição,
 * campos em grid de duas colunas e o rodapé de ações dentro do próprio cartão.
 *
 * Nenhum estado vive aqui: os componentes recebem o formulário, os erros e os
 * callbacks. A lógica de salvar/avançar/enviar continua em `$token.tsx`.
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
import {
  Building2,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  Music2,
  Printer,
  Search,
  Sparkles,
  UserRound,
  Wifi,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarDuracao } from "@/utils/brDocuments";
import { formatToBRL } from "@/utils/formatToBRL";
import {
  inputCepMask,
  inputCnpjMask,
  inputCpfMask,
  inputPhoneMask,
} from "@/utils/inputMasks";
import type { FormState } from "../-form";
import {
  digitsOnly,
  eventDateLabel,
  firstName,
  shortDateLabel,
} from "../-form";
import type {
  FormOptionsDto,
  Option,
  PublicBudgetDto,
  SubmitResultDto,
} from "../-types";
import {
  AreaInput,
  BackButton,
  Callout,
  CheckGrid,
  ContinueButton,
  Field,
  FieldError,
  Grid2,
  hasError,
  OfferList,
  RadioCards,
  ReviewBlock,
  ReviewLine,
  SectionTitle,
  SelectInput,
  StepActions,
  StepCard,
  TextInput,
  TimelineRow,
  ValueBlock,
} from "./public-ui";

/** Tudo que uma etapa precisa receber do container. */
export type StepProps = {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  errors: string[];
  options: FormOptionsDto | undefined;
  budget: PublicBudgetDto;
  duration: number | null;
  saving: boolean;
  goTo: (step: number) => void;
  next: (step: number) => void;
  cepBusy: boolean;
  cepMessage: string;
  lookupCep: () => void;
};

const CONTRACTOR_TYPES: Option[] = [
  {
    id: "PF",
    label: "Pessoa física",
    hint: "Você contratando para o seu evento",
  },
  {
    id: "PJ",
    label: "Pessoa jurídica",
    hint: "Empresa, sindicato ou produtora",
  },
];

// Os ids abaixo são os mesmos de `src/constants/event-options.ts` no backend
// (`~/src/http/routes/public/options/get-event-form-options-route.ts`), usados
// só se a consulta de opções ainda não tiver respondido.
const INTERNET_FALLBACK: Option[] = [
  { id: "yes", label: "Sim", hint: "Wi-fi ou cabo funcionando" },
  { id: "no", label: "Não", hint: "Sem rede no salão" },
  { id: "to_verify", label: "Não sei", hint: "Preciso confirmar" },
];

/** Estilo que abre o campo livre de repertório. */
const OTHER_STYLE_ID = "outro";

function optionsOr(fallback: Option[], options?: Option[]): Option[] {
  return options?.length ? options : fallback;
}

function labelOf(options: Option[] | undefined, id: string | null): string {
  if (!id) {
    return "—";
  }
  return options?.find((option) => option.id === id)?.label ?? id;
}

function addressLine(form: FormState): string {
  const head = `${form.street}, ${form.streetNumber}`;
  const tail = form.complement ? ` — ${form.complement}` : "";
  return `${head}${tail} · ${form.district} · ${form.city}/${form.state}`;
}

/* ------------------------------------------------------------------ etapa 0 */

export function ProposalStep({ budget, next }: StepProps) {
  const date = shortDateLabel(budget.eventDate);
  return (
    <StepCard
      actions={
        <StepActions
          back={
            <Button
              className="w-full text-muted-foreground sm:w-auto"
              onClick={() => window.print()}
              variant="ghost"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir esta página
            </Button>
          }
          next={
            <ContinueButton
              label="O valor está de acordo — continuar"
              onClick={() => next(1)}
            />
          }
        />
      }
      description={`${date} · proposta fechada com André Sonorização`}
      title={`Olá, ${firstName(budget.clientName)}! Vamos confirmar sua proposta?`}
    >
      <Callout icon={<Info className="h-4 w-4" />}>
        <p className="font-medium">
          Depois de aprovar o valor, precisamos de 4 informações para fechar o
          contrato.
        </p>
        <p>
          Dados de quem contrata, endereço completo, horário de início e fim e o
          estilo musical. Leva menos de 3 minutos e você pode salvar no meio e
          voltar pelo mesmo link.
        </p>
      </Callout>

      <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-2">
          <SectionTitle>O que está incluso</SectionTitle>
          {budget.offerItems.length ? (
            <OfferList items={budget.offerItems} section="Pacote contratado" />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
              Os itens do pacote ainda não foram detalhados nesta proposta.
            </p>
          )}
        </div>

        <ValueBlock
          caption="Valor fechado para o dia do evento, sem surpresas."
          label="Valor acordado"
          lines={
            <>
              <p>Data do evento: {date}</p>
              <p>Clientes: {budget.clientName}</p>
            </>
          }
          value={formatToBRL(budget.agreedValue)}
        />
      </div>
    </StepCard>
  );
}

/* ------------------------------------------------------------------ etapa 1 */

export function ContractorStep({
  form,
  setField,
  errors,
  options,
  saving,
  goTo,
  next,
}: StepProps) {
  const pj = form.contractorType === "PJ";
  return (
    <StepCard
      actions={
        <StepActions
          back={<BackButton onClick={() => goTo(0)} />}
          next={
            <ContinueButton
              label="Salvar e continuar"
              loading={saving}
              onClick={() => next(2)}
            />
          }
        />
      }
      description="Quem fica responsável pelo evento e por falar com a gente."
      title="Quem está contratando?"
    >
      <Field label="Tipo de contratante" required>
        <RadioCards
          namePrefix="contractor-type"
          onChange={(value) => setField("contractorType", value as "PF" | "PJ")}
          options={optionsOr(CONTRACTOR_TYPES, options?.contractorTypes)}
          value={form.contractorType}
        />
      </Field>

      <Grid2>
        <Field
          error={hasError(errors, "contractor.name")}
          htmlFor="f-name"
          label={pj ? "Razão social" : "Nome completo"}
          required
        >
          <TextInput
            id="f-name"
            invalid={hasError(errors, "contractor.name")}
            onChange={(value) => setField("name", value)}
            placeholder={pj ? "Nome registrado da empresa" : "Nome e sobrenome"}
            value={form.name}
          />
          <FieldError
            message="Informe o nome completo."
            show={hasError(errors, "contractor.name")}
          />
        </Field>

        {pj && (
          <Field
            error={hasError(errors, "contractor.tradeName")}
            htmlFor="f-trade"
            label="Nome fantasia"
            required
          >
            <TextInput
              id="f-trade"
              invalid={hasError(errors, "contractor.tradeName")}
              onChange={(value) => setField("tradeName", value)}
              placeholder="Como sua empresa é conhecida"
              value={form.tradeName}
            />
            <FieldError
              message="Informe o nome fantasia."
              show={hasError(errors, "contractor.tradeName")}
            />
          </Field>
        )}

        <Field
          error={hasError(errors, "contractor.document")}
          hint="Só os números: a gente separa com a máscara certa."
          htmlFor="f-document"
          label={pj ? "CNPJ" : "CPF"}
          required
        >
          <TextInput
            id="f-document"
            inputMode="numeric"
            invalid={hasError(errors, "contractor.document")}
            maxLength={pj ? 18 : 14}
            onChange={(value) =>
              setField(
                "document",
                pj ? inputCnpjMask(value) : inputCpfMask(value),
              )
            }
            placeholder={pj ? "00.000.000/0000-00" : "000.000.000-00"}
            value={form.document}
          />
          <FieldError
            message={pj ? "CNPJ inválido." : "CPF inválido."}
            show={hasError(errors, "contractor.document")}
          />
        </Field>

        <Field
          error={hasError(errors, "contractor.email")}
          htmlFor="f-email"
          label="E-mail"
          required
        >
          <TextInput
            id="f-email"
            inputMode="email"
            invalid={hasError(errors, "contractor.email")}
            onChange={(value) => setField("email", value)}
            placeholder="voce@exemplo.com.br"
            value={form.email}
          />
          <FieldError
            message="E-mail inválido."
            show={hasError(errors, "contractor.email")}
          />
        </Field>

        <Field
          error={hasError(errors, "contractor.phone")}
          hint="É por esse WhatsApp que confirmamos os detalhes do dia."
          htmlFor="f-phone"
          label="WhatsApp"
          required
        >
          <TextInput
            id="f-phone"
            inputMode="tel"
            invalid={hasError(errors, "contractor.phone")}
            maxLength={15}
            onChange={(value) => setField("phone", inputPhoneMask(value))}
            placeholder="(49) 9 9999-9999"
            value={form.phone}
          />
          <FieldError
            message="Informe um WhatsApp válido com DDD."
            show={hasError(errors, "contractor.phone")}
          />
        </Field>
      </Grid2>
    </StepCard>
  );
}

/* ------------------------------------------------------------------ etapa 2 */

export function VenueStep({
  form,
  setField,
  errors,
  options,
  saving,
  goTo,
  next,
  cepBusy,
  cepMessage,
  lookupCep,
}: StepProps) {
  return (
    <StepCard
      actions={
        <StepActions
          back={<BackButton onClick={() => goTo(1)} />}
          next={
            <ContinueButton
              label="Salvar e continuar"
              loading={saving}
              onClick={() => next(3)}
            />
          }
        />
      }
      description="Para a equipe chegar na hora certa e saber o que encontrar."
      title="Onde vai acontecer?"
    >
      <Field htmlFor="f-venue" label="Nome do local" optional>
        <TextInput
          id="f-venue"
          onChange={(value) => setField("venueName", value)}
          placeholder="Salão, clube, chácara, praça…"
          value={form.venueName}
        />
      </Field>

      <div className="space-y-2">
        <SectionTitle>Endereço</SectionTitle>
        <Grid2 className="sm:grid-cols-[minmax(0,14rem)_1fr]">
          <Field
            error={hasError(errors, "venue.zipCode")}
            hint={cepMessage || "Preenchemos o resto automaticamente."}
            htmlFor="f-zip"
            label="CEP"
            required
          >
            <div className="flex gap-2">
              <TextInput
                id="f-zip"
                inputMode="numeric"
                invalid={hasError(errors, "venue.zipCode")}
                maxLength={9}
                onChange={(value) => setField("zipCode", inputCepMask(value))}
                placeholder="00000-000"
                value={form.zipCode}
              />
              <Button
                className="shrink-0"
                disabled={cepBusy}
                onClick={lookupCep}
                size="icon"
                variant="outline"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Buscar CEP</span>
              </Button>
            </div>
            <FieldError
              message="CEP inválido."
              show={hasError(errors, "venue.zipCode")}
            />
          </Field>

          <Field
            error={hasError(errors, "venue.street")}
            htmlFor="f-street"
            label="Logradouro"
            required
          >
            <TextInput
              id="f-street"
              invalid={hasError(errors, "venue.street")}
              onChange={(value) => setField("street", value)}
              placeholder="Rua, avenida ou estrada"
              value={form.street}
            />
          </Field>
        </Grid2>

        <Grid2>
          <Field
            error={hasError(errors, "venue.streetNumber")}
            htmlFor="f-number"
            label="Número"
            required
          >
            <TextInput
              id="f-number"
              invalid={hasError(errors, "venue.streetNumber")}
              onChange={(value) => setField("streetNumber", value)}
              placeholder="Número / s/n"
              value={form.streetNumber}
            />
            <FieldError
              message="Informe o número."
              show={hasError(errors, "venue.streetNumber")}
            />
          </Field>

          <Field htmlFor="f-complement" label="Complemento" optional>
            <TextInput
              id="f-complement"
              onChange={(value) => setField("complement", value)}
              placeholder="Salão 2, fundos, próximo ao…"
              value={form.complement}
            />
          </Field>

          <Field
            error={hasError(errors, "venue.district")}
            htmlFor="f-district"
            label="Bairro"
            required
          >
            <TextInput
              id="f-district"
              invalid={hasError(errors, "venue.district")}
              onChange={(value) => setField("district", value)}
              placeholder="Bairro"
              value={form.district}
            />
          </Field>

          <Field
            error={hasError(errors, "venue.city")}
            htmlFor="f-city"
            label="Cidade"
            required
          >
            <TextInput
              id="f-city"
              invalid={hasError(errors, "venue.city")}
              onChange={(value) => setField("city", value)}
              placeholder="Cidade"
              value={form.city}
            />
          </Field>

          <Field
            error={hasError(errors, "venue.state")}
            htmlFor="f-state"
            label="Estado (UF)"
            required
          >
            <TextInput
              id="f-state"
              invalid={hasError(errors, "venue.state")}
              maxLength={2}
              onChange={(value) => setField("state", value.toUpperCase())}
              placeholder="SC"
              value={form.state}
            />
          </Field>

          <Field htmlFor="f-reference" label="Ponto de referência" optional>
            <TextInput
              id="f-reference"
              onChange={(value) => setField("reference", value)}
              placeholder="Portaria, entrada de serviço…"
              value={form.reference}
            />
          </Field>
        </Grid2>
      </div>

      <div className="space-y-2">
        <SectionTitle>Estrutura do local</SectionTitle>
        <Field
          error={hasError(errors, "venue.internetAvailable")}
          label="Tem internet no local?"
          required
        >
          <RadioCards
            columns={3}
            namePrefix="f-internet"
            onChange={(value) => setField("internetAvailable", value)}
            options={optionsOr(
              INTERNET_FALLBACK,
              options?.internetAvailability,
            )}
            value={form.internetAvailable}
          />
          <FieldError
            message="Marque uma opção."
            show={hasError(errors, "venue.internetAvailable")}
          />
        </Field>

        {form.internetAvailable === "yes" && (
          <Field
            htmlFor="f-internet-detail"
            label="Detalhe da internet"
            optional
          >
            <TextInput
              id="f-internet-detail"
              onChange={(value) => setField("internetDetail", value)}
              placeholder="Operadora, velocidade, onde fica o roteador"
              value={form.internetDetail}
            />
          </Field>
        )}

        <Grid2>
          <Field htmlFor="f-power" label="Energia no local" optional>
            <SelectInput
              id="f-power"
              onChange={(value) => setField("powerSupply", value)}
              options={options?.powerSupply}
              placeholder="Selecione"
              value={form.powerSupply}
            />
          </Field>
          <Field htmlFor="f-size" label="Tamanho do espaço" optional>
            <SelectInput
              id="f-size"
              onChange={(value) => setField("venueSize", value)}
              options={options?.venueSizes}
              placeholder="Selecione"
              value={form.venueSize}
            />
          </Field>
        </Grid2>
      </div>

      <Field
        hint="Como a equipe entra, onde descarrega e onde monta."
        label="Acesso e montagem"
        optional
      >
        <CheckGrid
          onToggle={(id, checked) =>
            setField(
              "accessNotes",
              checked
                ? [...form.accessNotes, id]
                : form.accessNotes.filter((item) => item !== id),
            )
          }
          options={optionsOr([], options?.accessNotes)}
          selected={form.accessNotes}
        />
      </Field>
    </StepCard>
  );
}

/* ------------------------------------------------------------------ etapa 3 */

export function ScheduleStep({
  form,
  setField,
  errors,
  options,
  duration,
  saving,
  goTo,
  next,
}: StepProps) {
  return (
    <StepCard
      actions={
        <StepActions
          back={<BackButton onClick={() => goTo(2)} />}
          next={
            <ContinueButton
              label="Salvar e continuar"
              loading={saving}
              onClick={() => next(4)}
            />
          }
        />
      }
      description="Três horários bastam: montagem, início e fim."
      title="Horários: montagem, início e fim"
    >
      <div className="space-y-2">
        <TimelineRow
          htmlFor="f-setup"
          icon={<Building2 className="h-4 w-4" />}
          invalid={hasError(errors, "schedule.setupTime")}
          onChange={(value) => setField("setupTime", value)}
          span="Chegada da equipe para montar som, luz e karaokê."
          title="Início da montagem"
          value={form.setupTime}
        />
        <TimelineRow
          htmlFor="f-start"
          icon={<Music2 className="h-4 w-4" />}
          invalid={hasError(errors, "schedule.startTime")}
          onChange={(value) => setField("startTime", value)}
          span="Quando o som começa a tocar para os convidados."
          title="Início do evento"
          value={form.startTime}
        />
        <TimelineRow
          htmlFor="f-end"
          icon={<Clock3 className="h-4 w-4" />}
          invalid={hasError(errors, "schedule.endTime")}
          onChange={(value) => setField("endTime", value)}
          span="Quando encerramos a parte musical."
          title="Fim do evento"
          trailing={
            <Button
              aria-pressed={form.endsNextDay}
              className="shrink-0 gap-1.5"
              onClick={() => setField("endsNextDay", !form.endsNextDay)}
              size="sm"
              variant={form.endsNextDay ? "default" : "outline"}
            >
              Vira a noite
            </Button>
          }
          value={form.endTime}
        />
        {hasError(errors, "schedule.endTime") && (
          <p className="font-medium text-destructive text-xs">
            Confira o intervalo: o fim precisa ser depois do início (marque
            &quot;vira a noite&quot; se terminar no dia seguinte).
          </p>
        )}
      </div>

      <div className="grid items-center gap-2 rounded-lg border bg-primary/5 p-3 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Duração prevista
          </p>
          <p className="text-muted-foreground text-sm">
            {form.startTime && form.endTime
              ? "Calculada a partir do início e do fim informados."
              : "Preencha o início e o fim para ver a duração."}
          </p>
        </div>
        <p className="font-semibold text-[22px] tabular-nums tracking-tight">
          {duration == null ? "—" : formatarDuracao(duration)}
        </p>
      </div>

      <Grid2>
        <Field htmlFor="f-pickup" label="Horário da retirada" optional>
          <TextInput
            id="f-pickup"
            invalid={false}
            onChange={(value) => setField("pickupTime", value)}
            placeholder="Se for em outro dia/horário"
            value={form.pickupTime}
          />
        </Field>
        <Field htmlFor="f-flex" label="O início pode flexionar?" optional>
          <SelectInput
            id="f-flex"
            onChange={(value) => setField("startsFlexibility", value)}
            options={options?.startsFlexibility}
            placeholder="Selecione"
            value={form.startsFlexibility}
          />
        </Field>
      </Grid2>

      <div className="space-y-2">
        <SectionTitle>Contato no dia</SectionTitle>
        <Grid2>
          <Field htmlFor="f-onsite-name" label="Pessoa no local" optional>
            <TextInput
              id="f-onsite-name"
              onChange={(value) => setField("onSiteContactName", value)}
              placeholder="Quem recebe a equipe"
              value={form.onSiteContactName}
            />
          </Field>
          <Field htmlFor="f-onsite-phone" label="WhatsApp do contato" optional>
            <TextInput
              id="f-onsite-phone"
              inputMode="tel"
              maxLength={15}
              onChange={(value) =>
                setField("onSiteContactPhone", inputPhoneMask(value))
              }
              placeholder="(49) 9 9999-9999"
              value={form.onSiteContactPhone}
            />
          </Field>
        </Grid2>
      </div>
    </StepCard>
  );
}

/* ------------------------------------------------------------------ etapa 4 */

export function EventStep({
  form,
  setField,
  errors,
  options,
  saving,
  goTo,
  next,
}: StepProps) {
  return (
    <StepCard
      actions={
        <StepActions
          back={<BackButton onClick={() => goTo(3)} />}
          next={
            <ContinueButton
              label="Salvar e continuar"
              loading={saving}
              onClick={() => next(5)}
            />
          }
        />
      }
      description="Repertório, público e detalhes que mudam a operação."
      title="Detalhes que fazem diferença"
    >
      <Grid2>
        <Field htmlFor="f-type" label="Tipo de evento" optional>
          <SelectInput
            id="f-type"
            onChange={(value) => setField("eventType", value)}
            options={options?.eventTypes}
            placeholder="Selecione"
            value={form.eventType}
          />
        </Field>
        <Field
          hint="Aproximado basta, para dimensionar caixas e microfones."
          htmlFor="f-guests"
          label="Público estimado"
          optional
        >
          <TextInput
            id="f-guests"
            inputMode="numeric"
            onChange={(value) => setField("guestCount", digitsOnly(value))}
            placeholder="Ex.: 180"
            value={form.guestCount}
          />
        </Field>
      </Grid2>

      <Field
        error={hasError(errors, "event.musicStyles")}
        hint="Escolha tudo que agrada o grupo; a playlist nasce daqui."
        label="Estilos musicais preferidos (para musicas do evento, sem contar o karaoke)"
        required
      >
        <CheckGrid
          invalid={hasError(errors, "event.musicStyles")}
          onToggle={(id, checked) =>
            setField(
              "musicStyles",
              checked
                ? [...form.musicStyles, id]
                : form.musicStyles.filter((item) => item !== id),
            )
          }
          options={optionsOr([], options?.musicStyles)}
          selected={form.musicStyles}
        />
        <FieldError
          message="Escolha pelo menos um estilo."
          show={hasError(errors, "event.musicStyles")}
        />
      </Field>

      {form.musicStyles.includes(OTHER_STYLE_ID) && (
        <Field htmlFor="f-style-other" label="Qual outro estilo?">
          <TextInput
            id="f-style-other"
            onChange={(value) => setField("musicStyleOther", value)}
            placeholder="Ex.: forró, sertanejo raiz, pagode…"
            value={form.musicStyleOther}
          />
        </Field>
      )}

      <Field
        hint="Lembrando que algumas opções acrescentam no valor, nossa equipe vai entrar em contato posteriormente."
        label="Extras e pedidos especiais"
        optional
      >
        <CheckGrid
          onToggle={(id, checked) =>
            setField(
              "requestedExtras",
              checked
                ? [...form.requestedExtras, id]
                : form.requestedExtras.filter((item) => item !== id),
            )
          }
          options={optionsOr([], options?.requestedExtras)}
          selected={form.requestedExtras}
        />
      </Field>

      <Field htmlFor="f-notes" label="Alguma observação?" optional>
        <AreaInput
          id="f-notes"
          onChange={(value) => setField("notes", value)}
          placeholder="Cerimônia, momento do parabéns, restrição de volume…"
          value={form.notes}
        />
      </Field>

      <Callout icon={<Sparkles className="h-4 w-4" />}>
        <p>
          Nada aqui trava o serviço: são preferências. Se faltar algum item, a
          gente combina pelo WhatsApp antes do evento.
        </p>
      </Callout>
    </StepCard>
  );
}

/* ------------------------------------------------------------------ etapa 5 */

export function ReviewStep({
  form,
  setField,
  errors,
  options,
  budget,
  duration,
  saving,
  goTo,
  onSubmit,
}: StepProps & { onSubmit: () => void }) {
  const pj = form.contractorType === "PJ";
  const accepted = hasError(errors, "acceptance.accepted");
  return (
    <StepCard
      actions={
        <StepActions
          back={<BackButton onClick={() => goTo(4)} />}
          next={
            <ContinueButton
              label={saving ? "Enviando…" : "Confirmar e enviar"}
              loading={saving}
              onClick={onSubmit}
            />
          }
        />
      }
      description="Última conferida antes de enviar para a André Sonorização."
      title="Confira antes de enviar"
    >
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Faltam informações</AlertTitle>
          <AlertDescription>
            Use os botões &quot;Editar&quot; abaixo para completar as etapas
            destacadas.
          </AlertDescription>
        </Alert>
      )}

      <ReviewBlock onEdit={() => goTo(1)} title="Quem está contratando">
        <ReviewLine
          label={pj ? "Razão social" : "Nome"}
          value={form.name || "não informado"}
        />
        {pj && <ReviewLine label="Nome fantasia" value={form.tradeName} />}
        <ReviewLine label={pj ? "CNPJ" : "CPF"} value={form.document} />
        <ReviewLine label="E-mail" value={form.email} />
        <ReviewLine label="WhatsApp" value={form.phone} />
      </ReviewBlock>

      <ReviewBlock onEdit={() => goTo(2)} title="Local do evento">
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

      <ReviewBlock onEdit={() => goTo(3)} title="Horários">
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
          value={duration == null ? "—" : formatarDuracao(duration)}
        />
        {form.pickupTime && (
          <ReviewLine label="Retirada" value={form.pickupTime} />
        )}
        {form.onSiteContactName && (
          <ReviewLine
            label="Contato no local"
            value={`${form.onSiteContactName}${form.onSiteContactPhone ? ` · ${form.onSiteContactPhone}` : ""}`}
          />
        )}
      </ReviewBlock>

      <ReviewBlock onEdit={() => goTo(4)} title="Detalhes do evento">
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
              ? form.musicStyles
                  .map((id) => labelOf(options?.musicStyles, id))
                  .join(", ") +
                (form.musicStyleOther ? ` · ${form.musicStyleOther}` : "")
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

      <ValueBlock
        caption={`Evento em ${eventDateLabel(budget.eventDate)}.`}
        label="Valor acordado"
        value={formatToBRL(budget.agreedValue)}
      />

      <div className="relative space-y-3 rounded-lg border p-4">
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={form.accepted}
            className="mt-0.5"
            onCheckedChange={(value) => setField("accepted", value === true)}
          />
          <div className="space-y-0.5">
            <p
              className={
                accepted
                  ? "font-medium text-destructive text-sm"
                  : "font-medium text-sm"
              }
            >
              Confirmo o valor de {formatToBRL(budget.agreedValue)} e as
              informações acima.{" "}
              {budget.details?.requestedExtras &&
              budget.details?.requestedExtras.length > 0
                ? "Lembrando que alguns extras podem acrescentar no valor."
                : ""}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Ao enviar, você registra o aceite da proposta. Nada é cobrado
              agora; o pagamento combina-se diretamente com a André Sonorização.
            </p>
            {accepted && (
              <p className="font-medium text-destructive text-xs">
                Marque a caixa para enviar.
              </p>
            )}
          </div>
        </div>

        <Field
          error={hasError(errors, "acceptance.name")}
          htmlFor="f-acceptance"
          label="Nome de quem confirma"
          required
        >
          <TextInput
            id="f-acceptance"
            invalid={hasError(errors, "acceptance.name")}
            onChange={(value) => setField("acceptanceName", value)}
            placeholder="Assinar o aceite"
            value={form.acceptanceName}
          />
          <FieldError
            message="Informe o nome de quem está confirmando."
            show={hasError(errors, "acceptance.name")}
          />
        </Field>

        {/* Honeypot: invisível para humanos, preenchido por bots. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden">
          <label htmlFor="f-website">Não preencha este campo</label>
          <TextInput
            id="f-website"
            onChange={(value) => setField("website", value)}
            tabIndex={-1}
            value={form.website}
          />
        </div>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Depois do envio, você recebe o número de protocolo e a André Sonorização
        confirma tudo pelo WhatsApp. Este link continua válido para consultas.
      </p>
    </StepCard>
  );
}

/* -------------------------------------------------------------- confirmação */

export function SuccessView({
  budget,
  result,
}: {
  budget: PublicBudgetDto;
  result: SubmitResultDto | null;
}) {
  const protocol = result?.protocol ?? null;
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-10 sm:px-6">
      <div className="rounded-lg border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-semibold text-[22px] tracking-tight">
          Recebido! Seu evento está reservado
        </h2>
        <p className="mx-auto mt-2 max-w-[46ch] text-muted-foreground text-sm leading-relaxed">
          {firstName(budget.clientName)}, confirmamos o aceite de{" "}
          {formatToBRL(result?.agreedValue ?? budget.agreedValue)} e as
          informações do evento. A equipe entra em contato pelo WhatsApp para
          alinhar os últimos detalhes.
        </p>

        {protocol && (
          <p className="mx-auto mt-5 w-fit rounded-md border border-dashed bg-muted/40 px-4 py-2 font-mono text-sm tracking-wider">
            {protocol}
          </p>
        )}

        {result?.durationMinutes != null && (
          <p className="mt-4 text-muted-foreground text-sm">
            Duração prevista do serviço:{" "}
            {formatarDuracao(result.durationMinutes)}
          </p>
        )}

        <div className="mt-6 grid justify-center gap-2 text-muted-foreground text-sm">
          <p className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            {eventDateLabel(budget.eventDate)}
          </p>
          <p className="flex items-center justify-center gap-2">
            <UserRound className="h-4 w-4" />
            André Sonorização · aluguel de som e karaokê
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ link inválido */

export function InvalidLinkView() {
  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-16 sm:px-6">
      <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Info className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-semibold text-lg tracking-tight">
          Este link não está mais disponível
        </h2>
        <p className="mx-auto mt-2 max-w-[44ch] text-muted-foreground text-sm leading-relaxed">
          A proposta pode ter sido atualizada ou substituída por uma nova. Peça
          o link atualizado para a André Sonorização e abra por lá.
        </p>
      </div>
    </div>
  );
}
