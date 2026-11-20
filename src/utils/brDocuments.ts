/**
 * Validadores de documentos e contatos brasileiros no navegador.
 *
 * Mesma regra do backend (`gestao-som-back/src/utils/documents.ts`). O front
 * valida para dar retorno imediato enquanto a pessoa digita; o backend valida
 * de novo, porque a página pública é chamada direto no navegador, sem sessão.
 */
/** biome-ignore-all lint/style/useFilenamingConvention: <explanation> */
/** biome-ignore-all lint/performance/useTopLevelRegex: máscaras simples, lidas no teclado */

import { inputCnpjMask, inputCpfMask } from './inputMasks';

export type ContractorType = 'PF' | 'PJ';

export const onlyDigits = (value?: string | null): string =>
  (value ?? '').replace(/\D/g, '');

/** CPF com dígito verificador (pesos 10..2 e 11..2). */
export const validarCPF = (value?: string | null): boolean => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
};

/** CNPJ com dígito verificador (pesos 5..2/9..2 e 6..2/9..2). */
export const validarCNPJ = (value?: string | null): boolean => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const pesos = (length: number) => {
    const lista: number[] = [];
    let peso = length - 7;
    for (let i = 0; i < length; i++) {
      lista[i] = peso;
      peso -= 1;
      if (peso < 2) {
        peso = 9;
      }
    }
    return lista;
  };

  const digito = (base: string, length: number) => {
    const lista = pesos(length);
    let soma = 0;
    for (let i = 0; i < length; i++) {
      soma += Number(base[i]) * lista[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    digito(cnpj, 12) === Number(cnpj[12]) &&
    digito(cnpj, 13) === Number(cnpj[13])
  );
};

export const validarDocumento = (
  value: string | null | undefined,
  type: ContractorType
): boolean => (type === 'PJ' ? validarCNPJ(value) : validarCPF(value));

export const validarEmail = (value?: string | null): boolean => {
  const email = (value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 160;
};

/** WhatsApp BR: DDD (11..99) + 8 dígitos, ou 9º dígito começando com 9. */
export const validarWhatsapp = (value?: string | null): boolean => {
  const digits = onlyDigits(value);
  if (digits.length < 10 || digits.length > 11) {
    return false;
  }
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }
  if (digits.length === 11 && digits[2] !== '9') {
    return false;
  }
  return true;
};

export const validarCep = (value?: string | null): boolean =>
  onlyDigits(value).length === 8;

/** "20:00" -> 1200 minutos; null quando o valor não é hora válida. */
export const minutosDoHorario = (value?: string | null): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((value ?? '').trim());
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Duração do serviço em minutos, com virada de dia explícita.
 * Espelha `serviceDurationMinutes` do backend para a prévia bater com o recibo.
 */
export const duracaoServicoMinutos = (params: {
  startTime?: string | null;
  endTime?: string | null;
  endsNextDay?: boolean;
}): number | null => {
  const start = minutosDoHorario(params.startTime);
  const end = minutosDoHorario(params.endTime);
  if (start == null || end == null) {
    return null;
  }
  const total = end - start + (params.endsNextDay ? 1440 : 0);
  return total > 0 ? total : null;
};

export const formatarDuracao = (minutes: number | null): string => {
  if (minutes == null) {
    return '—';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) {
    return `${m} min`;
  }
  if (!m) {
    return `${h}h`;
  }
  return `${h}h${String(m).padStart(2, '0')}`;
};

/** Documento persistido sem máscara -> exibição legível. */
export const formatarDocumento = (value?: string | null): string => {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return inputCpfMask(digits);
  }
  if (digits.length === 14) {
    return inputCnpjMask(digits);
  }
  return value ?? '';
};
