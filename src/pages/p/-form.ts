/**
 * Estado do formulário público, metadados das etapas e validações.
 *
 * Fica separado da rota para a tela (`$token.tsx`) carregar só a montagem do
 * layout. As regras batem com `src/http/routes/public/budgets/validators.ts`
 * do backend — o front valida para dar retorno imediato, o back valida de novo.
 */
/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  duracaoServicoMinutos,
  onlyDigits,
  validarCep,
  validarDocumento,
  validarEmail,
  validarWhatsapp,
} from '@/utils/brDocuments';
import {
  inputCepMask,
  inputCnpjMask,
  inputCpfMask,
  inputPhoneMask,
} from '@/utils/inputMasks';
import type { PublicDetailsDto } from './-types';

export type ContractorKind = 'PF' | 'PJ';

export type FormState = {
  contractorType: ContractorKind;
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  venueName: string;
  zipCode: string;
  street: string;
  streetNumber: string;
  district: string;
  city: string;
  state: string;
  complement: string;
  reference: string;
  accessNotes: string[];
  powerSupply: string;
  venueSize: string;
  internetAvailable: string;
  internetDetail: string;
  setupTime: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  pickupTime: string;
  startsFlexibility: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  eventType: string;
  guestCount: string;
  musicStyles: string[];
  musicStyleOther: string;
  requestedExtras: string[];
  notes: string;
  acceptanceName: string;
  accepted: boolean;
  /** Honeypot: ninguém preenche; se vier texto, o backend recusa. */
  website: string;
};

export const emptyForm: FormState = {
  contractorType: 'PF',
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  venueName: '',
  zipCode: '',
  street: '',
  streetNumber: '',
  district: '',
  city: '',
  state: '',
  complement: '',
  reference: '',
  accessNotes: [],
  powerSupply: '',
  venueSize: '',
  internetAvailable: '',
  internetDetail: '',
  setupTime: '',
  startTime: '',
  endTime: '',
  endsNextDay: false,
  pickupTime: '',
  startsFlexibility: '',
  onSiteContactName: '',
  onSiteContactPhone: '',
  eventType: '',
  guestCount: '',
  musicStyles: [],
  musicStyleOther: '',
  requestedExtras: [],
  notes: '',
  acceptanceName: '',
  accepted: false,
  website: '',
};

/**
 * Etapas na ordem do protótipo: proposta → quem contrata → local → horários →
 * detalhes → revisão. Cada uma tem o título e a linha de apoio que aparecem no
 * cabeçalho do cartão.
 */
export const FORM_STEPS = [
  {
    id: 0,
    short: 'Proposta',
    title: 'Sua proposta confirmada',
    description: 'O valor que já combinamos, em texto simples.',
  },
  {
    id: 1,
    short: 'Você',
    title: 'Quem está contratando?',
    description: 'Dados de quem fica responsável pelo evento.',
  },
  {
    id: 2,
    short: 'Local',
    title: 'Onde vai acontecer?',
    description: 'Endereço completo e o que o local já tem.',
  },
  {
    id: 3,
    short: 'Horários',
    title: 'Horários: montagem, início e fim',
    description: 'Com isso a equipe chega na hora certa.',
  },
  {
    id: 4,
    short: 'Detalhes',
    title: 'Detalhes que fazem diferença',
    description: 'Repertório, público e pedidos especiais.',
  },
  {
    id: 5,
    short: 'Revisão',
    title: 'Confira antes de enviar',
    description: 'Última olhada em tudo, etapa por etapa.',
  },
] as const;

export const LAST_FORM_STEP = FORM_STEPS.length - 1;

/** Para onde cada campo pertence, usado no `?etapa=` e no foco de erro. */
export const FIELD_TO_STEP: Record<string, number> = {
  contractor: 1,
  venue: 2,
  schedule: 3,
  event: 4,
  acceptance: 5,
};

export function stepForField(errors: string[], fallback: number): number {
  const group = errors[0]?.split('.')[0];
  return FIELD_TO_STEP[group ?? ''] ?? fallback;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function eventDateLabel(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function shortDateLabel(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function toggleValue(
  current: string[],
  value: string,
  checked: boolean
): string[] {
  if (checked) {
    return current.includes(value) ? current : [...current, value];
  }
  return current.filter((item) => item !== value);
}

export function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export function timeMinutes(value: string): number | null {
  const [h, m] = value.split(':').map(Number);
  if (
    !(Number.isInteger(h) && Number.isInteger(m)) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return null;
  }
  return h * 60 + m;
}

/**
 * Corpo do PATCH de rascunho para a etapa que está saindo. Manda só o bloco da
 * etapa, porque o backend faz merge parcial e preserva as etapas anteriores.
 */
export function payloadForStep(
  step: number,
  form: FormState,
  nextStep: number
): Record<string, unknown> {
  const payload: Record<string, unknown> = { step: nextStep };
  if (step === 1) {
    payload.contractor = {
      type: form.contractorType,
      name: form.name,
      tradeName: form.tradeName || null,
      document: form.document,
      email: form.email,
      phone: form.phone,
    };
  }
  if (step === 2) {
    payload.venue = {
      venueName: form.venueName || null,
      zipCode: form.zipCode,
      street: form.street,
      streetNumber: form.streetNumber,
      district: form.district,
      city: form.city,
      state: form.state,
      complement: form.complement || null,
      reference: form.reference || null,
      accessNotes: form.accessNotes,
      powerSupply: form.powerSupply || null,
      venueSize: form.venueSize || null,
      internetAvailable: form.internetAvailable,
      internetDetail: form.internetDetail || null,
    };
  }
  if (step === 3) {
    payload.schedule = {
      setupTime: form.setupTime,
      startTime: form.startTime,
      endTime: form.endTime,
      endsNextDay: form.endsNextDay,
      ...(form.pickupTime ? { pickupTime: form.pickupTime } : {}),
      startsFlexibility: form.startsFlexibility || null,
      onSiteContactName: form.onSiteContactName || null,
      onSiteContactPhone: form.onSiteContactPhone || null,
    };
  }
  if (step === 4) {
    payload.event = {
      eventType: form.eventType || null,
      guestCount: form.guestCount ? Number(form.guestCount) : null,
      musicStyles: form.musicStyles,
      musicStyleOther: form.musicStyleOther || null,
      requestedExtras: form.requestedExtras,
      notes: form.notes || null,
    };
  }
  return payload;
}

/** Corpo do POST de envio: tudo de uma vez, já normalizado. */
export function submitPayload(form: FormState) {
  return {
    contractor: {
      type: form.contractorType,
      name: form.name.trim(),
      ...(form.contractorType === 'PJ'
        ? { tradeName: form.tradeName.trim() }
        : {}),
      document: form.document,
      email: form.email.trim().toLowerCase(),
      phone: form.phone,
    },
    venue: {
      venueName: emptyToNull(form.venueName),
      zipCode: form.zipCode,
      street: form.street.trim(),
      streetNumber: form.streetNumber.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
      state: form.state.toUpperCase(),
      complement: emptyToNull(form.complement),
      reference: emptyToNull(form.reference),
      accessNotes: form.accessNotes,
      powerSupply: emptyToNull(form.powerSupply),
      venueSize: emptyToNull(form.venueSize),
      internetAvailable: form.internetAvailable,
      internetDetail: emptyToNull(form.internetDetail),
    },
    schedule: {
      setupTime: form.setupTime,
      startTime: form.startTime,
      endTime: form.endTime,
      endsNextDay: form.endsNextDay,
      ...(form.pickupTime ? { pickupTime: form.pickupTime } : {}),
      ...(form.startsFlexibility
        ? { startsFlexibility: form.startsFlexibility }
        : {}),
      ...(form.onSiteContactName
        ? { onSiteContactName: form.onSiteContactName.trim() }
        : {}),
      ...(form.onSiteContactPhone
        ? { onSiteContactPhone: form.onSiteContactPhone }
        : {}),
    },
    event: {
      ...(form.eventType ? { eventType: form.eventType } : {}),
      ...(form.guestCount ? { guestCount: Number(form.guestCount) } : {}),
      musicStyles: form.musicStyles,
      ...(form.musicStyleOther
        ? { musicStyleOther: form.musicStyleOther.trim() }
        : {}),
      requestedExtras: form.requestedExtras,
      ...(form.notes ? { notes: form.notes.trim() } : {}),
    },
    acceptance: {
      name: form.acceptanceName.trim(),
      website: form.website,
    },
  };
}

export function contractorErrors(form: FormState): string[] {
  const errors: string[] = [];
  if (form.name.trim().length < 3) {
    errors.push('contractor.name');
  }
  if (form.contractorType === 'PJ' && form.tradeName.trim().length < 2) {
    errors.push('contractor.tradeName');
  }
  if (!validarDocumento(form.document, form.contractorType)) {
    errors.push('contractor.document');
  }
  if (!validarEmail(form.email)) {
    errors.push('contractor.email');
  }
  if (!validarWhatsapp(form.phone)) {
    errors.push('contractor.phone');
  }
  return errors;
}

export function venueErrors(form: FormState): string[] {
  const errors: string[] = [];
  if (!validarCep(form.zipCode)) {
    errors.push('venue.zipCode');
  }
  if (!form.street.trim()) {
    errors.push('venue.street');
  }
  if (!form.streetNumber.trim()) {
    errors.push('venue.streetNumber');
  }
  if (!form.district.trim()) {
    errors.push('venue.district');
  }
  if (!form.city.trim()) {
    errors.push('venue.city');
  }
  if (!/^[A-Za-z]{2}$/.test(form.state.trim())) {
    errors.push('venue.state');
  }
  if (!form.internetAvailable) {
    errors.push('venue.internetAvailable');
  }
  return errors;
}

export function scheduleErrors(form: FormState): string[] {
  const errors: string[] = [];
  const setup = timeMinutes(form.setupTime);
  const start = timeMinutes(form.startTime);
  const end = timeMinutes(form.endTime);
  if (setup == null || (start != null && setup >= start)) {
    errors.push('schedule.setupTime');
  }
  if (start == null) {
    errors.push('schedule.startTime');
  }
  if (end == null || duracaoServicoMinutos(form) == null) {
    errors.push('schedule.endTime');
  }
  return errors;
}

export function eventErrors(form: FormState): string[] {
  return form.musicStyles.length ? [] : ['event.musicStyles'];
}

export function validateStep(step: number, form: FormState): string[] {
  if (step === 1) {
    return contractorErrors(form);
  }
  if (step === 2) {
    return venueErrors(form);
  }
  if (step === 3) {
    return scheduleErrors(form);
  }
  if (step === 4) {
    return eventErrors(form);
  }
  return [];
}

export function validateAll(form: FormState): string[] {
  return [
    ...contractorErrors(form),
    ...venueErrors(form),
    ...scheduleErrors(form),
    ...eventErrors(form),
    ...(form.accepted ? [] : ['acceptance.accepted']),
    ...(form.acceptanceName.trim().length < 3 ? ['acceptance.name'] : []),
  ];
}

/** Rascunho salvo no backend → estado do formulário (com máscaras de novo). */
export function detailsToForm(details: PublicDetailsDto): Partial<FormState> {
  return {
    contractorType: details.contractorType === 'PJ' ? 'PJ' : 'PF',
    name: details.contractorName ?? '',
    tradeName: details.tradeName ?? '',
    document: details.document
      ? details.contractorType === 'PJ'
        ? inputCnpjMask(details.document)
        : inputCpfMask(details.document)
      : '',
    email: details.email ?? '',
    phone: details.phone ? inputPhoneMask(details.phone) : '',
    venueName: details.venueName ?? '',
    zipCode: details.zipCode ? inputCepMask(details.zipCode) : '',
    street: details.street ?? '',
    streetNumber: details.streetNumber ?? '',
    district: details.district ?? '',
    city: details.city ?? '',
    state: details.state ?? '',
    complement: details.complement ?? '',
    reference: details.reference ?? '',
    accessNotes: details.accessNotes ?? [],
    powerSupply: details.powerSupply ?? '',
    venueSize: details.venueSize ?? '',
    internetAvailable: details.internetAvailable ?? '',
    internetDetail: details.internetDetail ?? '',
    setupTime: details.setupTime ?? '',
    startTime: details.startTime ?? '',
    endTime: details.endTime ?? '',
    endsNextDay: details.endsNextDay,
    pickupTime: details.pickupTime ?? '',
    startsFlexibility: details.startsFlexibility ?? '',
    onSiteContactName: details.onSiteContactName ?? '',
    onSiteContactPhone: details.onSiteContactPhone
      ? inputPhoneMask(details.onSiteContactPhone)
      : '',
    eventType: details.eventType ?? '',
    guestCount: details.guestCount ? String(details.guestCount) : '',
    musicStyles: details.musicStyles ?? [],
    musicStyleOther: details.musicStyleOther ?? '',
    requestedExtras: details.requestedExtras ?? [],
    notes: details.notes ?? '',
    acceptanceName: '',
  };
}

/** Só dígitos, para o campo de público estimado. */
export function digitsOnly(value: string, max = 5): string {
  return onlyDigits(value).slice(0, max);
}
