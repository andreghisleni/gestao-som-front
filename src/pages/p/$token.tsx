/**
 * Página pública de confirmação de orçamento: `/p/$token`.
 *
 * Abre fora do layout autenticado (sem `_app`), então estática é a regra: só o
 * valor acordado, sem preço unitário, sem nome de equipamento e sem dados do
 * usuário interno. O objetivo é coletar e confirmar os dados do evento depois
 * de o valor já estar fechado.
 *
 * A apresentação fica em `./-components/` e o estado/validação em `./-form.ts`.
 * Este arquivo mantém só a orquestração: carregar a proposta, salvar rascunho
 * por etapa, enviar tudo e tratar link inválido. As cores vêm dos tokens do
 * projeto, então a página acompanha o tema dark/light do restante do sistema.
 */
/** biome-ignore-all lint/nursery/noShadow: <explanation> */
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getPublicBudgetQueryKey,
  useGetEventFormOptions,
  useGetPublicBudget,
  useSavePublicEventDetails,
  useSubmitPublicEventDetails,
} from '@/http/generated';
import {
  duracaoServicoMinutos,
  onlyDigits,
  validarCep,
} from '@/utils/brDocuments';
import { PublicTopbar, Stepper } from './-components/public-ui';
import {
  ContractorStep,
  EventStep,
  InvalidLinkView,
  ProposalStep,
  ReviewStep,
  ScheduleStep,
  SuccessView,
  VenueStep,
} from './-components/steps';
import type { FormState } from './-form';
import {
  detailsToForm,
  emptyForm,
  FORM_STEPS,
  LAST_FORM_STEP,
  payloadForStep,
  stepForField,
  submitPayload,
  validateAll,
  validateStep,
} from './-form';
import type {
  FormOptionsDto,
  PublicBudgetDto,
  SubmitErrorDto,
  SubmitResultDto,
} from './-types';

export const Route = createFileRoute('/p/$token')({
  component: PublicEventPage,
});

function PublicEventPage() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const budgetQuery = useGetPublicBudget(token);
  const optionsQuery = useGetEventFormOptions();
  const saveDraft = useSavePublicEventDetails();
  const submitDetails = useSubmitPublicEventDetails();

  const budget = budgetQuery.data as PublicBudgetDto | undefined;
  const options = optionsQuery.data as FormOptionsDto | undefined;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SubmitResultDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepMessage, setCepMessage] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Restaura o rascunho salvo uma única vez, para não cobrir edições em curso.
  useEffect(() => {
    const details = budget?.details;
    if (!details || hydrated.current) { return; }
    hydrated.current = true;
    setForm((current) => ({ ...current, ...detailsToForm(details) }));
    const seen = Math.min(Math.max(details.stepSeen ?? 0, 0), LAST_FORM_STEP);
    if (seen > 0) { setStep(seen); }
    if (details.contractorName) { setSavedAt('no último acesso'); }
  }, [budget?.details]);

  const duration = useMemo(
    () =>
      duracaoServicoMinutos({
        startTime: form.startTime,
        endTime: form.endTime,
        endsNextDay: form.endsNextDay,
      }),
    [form.startTime, form.endTime, form.endsNextDay]
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    const pathMap: Partial<Record<keyof FormState, string>> = {
      name: 'contractor.name',
      tradeName: 'contractor.tradeName',
      document: 'contractor.document',
      email: 'contractor.email',
      phone: 'contractor.phone',
      zipCode: 'venue.zipCode',
      street: 'venue.street',
      streetNumber: 'venue.streetNumber',
      district: 'venue.district',
      city: 'venue.city',
      state: 'venue.state',
      internetAvailable: 'venue.internetAvailable',
      setupTime: 'schedule.setupTime',
      startTime: 'schedule.startTime',
      endTime: 'schedule.endTime',
      musicStyles: 'event.musicStyles',
      acceptanceName: 'acceptance.name',
      accepted: 'acceptance.accepted',
    };
    const path = pathMap[key];
    if (path) { setFieldErrors((current) => current.filter((e) => e !== path)); }
  };

  const goTo = (next: number) => {
    setStep(Math.min(Math.max(next, 0), LAST_FORM_STEP));
    setFieldErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Salva o bloco da etapa atual como rascunho e avança. */
  const next = async (target: number) => {
    const errors = validateStep(step, form);
    if (errors.length) {
      setFieldErrors(errors);
      toast.error('Confira os campos destacados para continuar.');
      return;
    }
    try {
      const data = payloadForStep(step, form, target);
      await saveDraft.mutateAsync({ token, data });
      setSavedAt(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      await queryClient.invalidateQueries({
        queryKey: getPublicBudgetQueryKey(token),
      });
      goTo(target);
    } catch {
      toast.error('Não foi possível salvar agora. Tente novamente.');
    }
  };

  const submit = async () => {
    const errors = validateAll(form);
    if (errors.length) {
      setFieldErrors(errors);
      goTo(stepForField(errors, LAST_FORM_STEP));
      toast.error('Faltam informações para enviar.');
      return;
    }
    try {
      const response = await submitDetails.mutateAsync({
        token,
        data: submitPayload(form),
      });
      setResult(response as SubmitResultDto);
      await queryClient.invalidateQueries({
        queryKey: getPublicBudgetQueryKey(token),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const payload = (error as { response?: { data?: SubmitErrorDto } })
        .response?.data;
      if (payload?.fields?.length) {
        setFieldErrors(payload.fields);
        goTo(stepForField(payload.fields, LAST_FORM_STEP));
        toast.error(payload.error ?? 'Confira os campos destacados.');
      } else {
        toast.error('Não foi possível enviar agora. Tente novamente.');
      }
    }
  };

  /** Consulta o CEP no ViaCEP e completa o que estiver vazio. */
  const lookupCep = async () => {
    const digits = onlyDigits(form.zipCode);
    if (!validarCep(digits)) {
      setCepMessage('Informe os 8 dígitos do CEP.');
      return;
    }
    setCepBusy(true);
    setCepMessage('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) { throw new Error('CEP'); }
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        setCepMessage('CEP não encontrado. Preencha manualmente.');
      } else {
        setForm((current) => ({
          ...current,
          street: current.street || data.logradouro || '',
          district: current.district || data.bairro || '',
          city: current.city || data.localidade || '',
          state: current.state || data.uf || '',
        }));
        setCepMessage('Endereço preenchido. Confira o número e o complemento.');
      }
    } catch {
      setCepMessage('Não foi possível consultar o CEP agora.');
    } finally {
      setCepBusy(false);
    }
  };

  if (budgetQuery.isLoading || optionsQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2.5 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando sua proposta…
        </div>
      </main>
    );
  }

  if (budgetQuery.isError || !budget) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <InvalidLinkView />
      </main>
    );
  }

  if (result || budget.submitted) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SuccessView budget={budget} result={result} />
      </main>
    );
  }

  const current = FORM_STEPS[step] ?? FORM_STEPS[0];
  const stepProps = {
    budget,
    cepBusy,
    cepMessage,
    duration,
    errors: fieldErrors,
    form,
    goTo,
    lookupCep,
    next,
    options,
    saving: saveDraft.isPending || submitDetails.isPending,
    setField,
  };

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <PublicTopbar savedAt={savedAt} saving={saveDraft.isPending} />
      <div className="mx-auto w-full max-w-[880px] px-5 py-7 sm:px-6">
        <Stepper current={step} onSelect={goTo} />

        {step === 0 && <ProposalStep {...stepProps} />}
        {step === 1 && <ContractorStep {...stepProps} />}
        {step === 2 && <VenueStep {...stepProps} />}
        {step === 3 && <ScheduleStep {...stepProps} />}
        {step === 4 && <EventStep {...stepProps} />}
        {step === 5 && (
          // biome-ignore lint/complexity/noVoid: <explanation>
          <ReviewStep {...stepProps} onSubmit={() => void submit()} />
        )}

        <p className='mt-6 text-center text-muted-foreground text-xs leading-relaxed'>
          Etapa {step + 1} de {FORM_STEPS.length}: {current.title}. Nada é
          cobrado agora — este formulário só confirma o que já foi combinado.
        </p>
      </div>
    </main>
  );
}
