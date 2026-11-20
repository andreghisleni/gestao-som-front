/**
 * Tipos locais da página pública.
 *
 * Espelham `src/http/routes/public/budgets/schemas.ts` no backend. O motivo de
 * não importar os tipos do kubb é de propósito: a superfície pública é estreita
 * e small, e assim a tela não quebra quando um campo interno do orçamento muda.
 * Se o DTO do back mudar, este arquivo é o único ponto de ajuste no front.
 */

export type Option = {
  id: string;
  label: string;
  hint?: string;
};

export type FormOptionsKey =
  | 'musicStyles'
  | 'eventTypes'
  | 'accessNotes'
  | 'powerSupply'
  | 'internetAvailability'
  | 'venueSizes'
  | 'startsFlexibility'
  | 'requestedExtras'
  | 'contractorTypes';

export type FormOptionsDto = Record<FormOptionsKey, Option[]>;

export type PublicOfferLine = {
  name: string;
  detail: string | null;
};

export type PublicDetailsDto = {
  id: string;
  contractorType: string;
  contractorName: string | null;
  tradeName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  venueName: string | null;
  zipCode: string | null;
  street: string | null;
  streetNumber: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  reference: string | null;
  accessNotes: string[];
  powerSupply: string | null;
  venueSize: string | null;
  internetAvailable: string | null;
  internetDetail: string | null;
  setupTime: string | null;
  startTime: string | null;
  endTime: string | null;
  endsNextDay: boolean;
  pickupTime: string | null;
  startsFlexibility: string | null;
  onSiteContactName: string | null;
  onSiteContactPhone: string | null;
  eventType: string | null;
  guestCount: number | null;
  musicStyles: string[];
  musicStyleOther: string | null;
  requestedExtras: string[];
  notes: string | null;
  stepSeen: number;
  completedAt: string | null;
};

export type PublicBudgetDto = {
  token: string;
  clientName: string;
  eventDate: string;
  status: string;
  /** Único valor monetário que a página pública conhece. */
  agreedValue: number;
  offerItems: PublicOfferLine[];
  details: PublicDetailsDto | null;
  acceptance: {
    acceptedName: string;
    acceptedValue: number;
    acceptedAt: string;
  } | null;
  submitted: boolean;
};

export type SubmitResultDto = {
  protocol: string;
  submittedAt: string;
  agreedValue: number;
  status: string;
  durationMinutes: number | null;
  alreadySubmitted: boolean;
};

/** Resposta dos erros de submit: `{ error, fields }` com caminhos de campo. */
export type SubmitErrorDto = {
  error: string;
  fields?: string[];
};

export const STEPS = [
  { id: 0, short: 'Proposta', title: 'Sua proposta' },
  { id: 1, short: 'Você', title: 'Quem contrata' },
  { id: 2, short: 'Local', title: 'Onde o som chega' },
  { id: 3, short: 'Horários', title: 'Quando montamos e tocamos' },
  { id: 4, short: 'Detalhes', title: 'Repertório e detalhes' },
  { id: 5, short: 'Revisão', title: 'Confira antes de enviar' },
] as const;

export const LAST_FORM_STEP = 5;
