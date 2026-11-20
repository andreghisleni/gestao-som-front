/** biome-ignore-all lint/style/useBlockStatements: <explanation> */
/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */
export const inputCpfMask = (cpf: string | null) => {
  if (cpf === null) return "";

  const noMask = cpf.replace(/\D/g, "");
  const { length } = noMask;

  if (length <= 3) {
    return noMask;
  }

  if (length <= 6) {
    return noMask.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  }

  if (length <= 9) {
    return noMask.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  }

  return noMask.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
};

// phone example (99) 9 9999-9999
export const inputPhoneMask = (phone: string | null) => {
  if (phone === null) return "";

  const noMask = phone.replace(/\D/g, "");
  const { length } = noMask;

  if (length <= 2) {
    return noMask;
  }

  if (length <= 3) {
    return noMask.replace(/(\d{2})(\d{1})/, "($1) $2");
  }

  if (length <= 7) {
    return noMask.replace(/(\d{2})(\d{1})(\d{4})/, "($1) $2 $3");
  }

  if (length <= 10) {
    return noMask.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return noMask.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2 $3-$4");
};

// cep example 99999-999
export const inputCepMask = (cep: string | null) => {
  if (cep === null) return "";

  const noMask = cep.replace(/\D/g, "");
  const { length } = noMask;

  if (length <= 5) {
    return noMask;
  }

  return noMask.replace(/(\d{5})(\d{1,3})/, "$1-$2");
};

// just numbers
export const inputNumberMask = (number: string | null) => {
  if (number === null) return "";

  return number.replace(/\D/g, "");
};

// cnpj example 99.999.999/9999-99
export const inputCnpjMask = (cnpj: string | null) => {
  if (cnpj === null) return "";

  const noMask = cnpj.replace(/\D/g, "");
  const { length } = noMask;

  if (length <= 2) {
    return noMask;
  }

  if (length <= 6) {
    return noMask.replace(/(\d{2})(\d{1,4})/, "$1.$2");
  }

  if (length <= 9) {
    return noMask.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  }

  if (length <= 12) {
    return noMask.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
  }

  return noMask.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/,
    "$1.$2.$3/$4-$5",
  );
};

/**
 * CPF ou CNPJ no mesmo campo: a máscara segue o tanto de dígitos digitados,
 * então dá para colar o número formatado ou só os algarismos.
 */
export const inputDocMask = (value: string | null) => {
  const digits = (value ?? "").replace(/\D/g, "");

  return digits.length > 11 ? inputCnpjMask(digits) : inputCpfMask(digits);
};
