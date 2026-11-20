/**
 * Valor monetário por extenso, em português.
 *
 * O recibo pede a cláusula clássica — "a importância de R$ 700,00
 * (setecentos reais)" — e é exatamente por isso que ela não pode ser digitada
 * à mão a cada recibo: número e extenso precisam bater, e extenso escrito à
 * mão é onde mora o erro que depois vira discussão.
 *
 * Regras que este arquivo aplica (e que uma implementação ingênua erra):
 *  - `cem` só quando a centena vem sozinha; `cento e cinco` quando tem resto;
 *  - `mil` sem "um" na frente (1000 = "mil", não "um mil");
 *  - `e` antes do último grupo quando ele vale menos de 100 ou é centena
 *    fechada (1.200 = "mil e duzentos"; 1.234 = "mil, duzentos e trinta e
 *    quatro");
 *  - singular/plural das escalas (1 milhão / 2 milhões);
 *  - escala fechada pede preposição: "um milhão DE reais", mas "mil reais";
 *  - centavos entram por último, também no singular quando valem 1.
 *
 * Trabalha em centavos inteiros, então R$ 1.234,56 não sofre dos arredonda-
 * mentos de ponto flutuante que uma conta `Math.floor(valor % 1)` traria.
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */

const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

/** Índice 0 = unidades, 1 = milhares, 2 = milhões... */
const ESCALAS = [
  { singular: "", plural: "" },
  { singular: "mil", plural: "mil" },
  { singular: "milhão", plural: "milhões" },
  { singular: "bilhão", plural: "bilhões" },
  { singular: "trilhão", plural: "trilhões" },
];

/** 1..99 */
function extensoDezena(value: number): string {
  if (value < 20) {
    return UNIDADES[value] as string;
  }
  const dezena = Math.floor(value / 10);
  const resto = value % 10;
  const base = DEZENAS[dezena] as string;
  return resto === 0 ? base : `${base} e ${UNIDADES[resto]}`;
}

/** 1..999 */
function extensoCentena(value: number): string {
  if (value === 100) {
    return "cem";
  }
  const centena = Math.floor(value / 100);
  const resto = value % 100;
  const base = centena > 0 ? (CENTENAS[centena] as string) : "";
  if (resto === 0) {
    return base;
  }
  const restoExtenso = extensoDezena(resto);
  return base === "" ? restoExtenso : `${base} e ${restoExtenso}`;
}

/** Terminou em milhão/bilhão/trilhão -> entra a preposição "de" antes da moeda. */
const ESCALA_COM_DE = /(milh|bilh|trilh)([ãa]o|[õo]es)$/;

/** Inteiro >= 0, sem a palavra da moeda. */
function extensoInteiro(value: number): string {
  if (value === 0) {
    return "zero";
  }

  const grupos: number[] = [];
  let resto = value;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes: { texto: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const grupo = grupos[i] as number;
    if (grupo === 0) {
      continue;
    }
    const escala = ESCALAS[i] as (typeof ESCALAS)[number];
    const nome = grupo > 1 ? escala.plural : escala.singular;
    // 1.000 -> "mil"; 1.000.000 -> "um milhão".
    const texto =
      grupo === 1 && i === 1
        ? "mil"
        : nome === ""
          ? extensoCentena(grupo)
          : `${extensoCentena(grupo)} ${nome}`;
    partes.push({ texto, valor: grupo });
  }

  let saida = partes.map((parte) => parte.texto).join(", ");
  // Último grupo fraco (<= 99) ou centena fechada entra com "e".
  if (partes.length > 1) {
    const ultimo = partes.at(-1) as {
      texto: string;
      valor: number;
    };
    if (ultimo.valor < 100 || ultimo.valor % 100 === 0) {
      const corte = saida.lastIndexOf(", ");
      saida = `${saida.slice(0, corte)} e ${saida.slice(corte + 2)}`;
    }
  }
  return saida;
}

/**
 * "700 -> setecentos reais", "1000 -> mil reais",
 * "1234.56 -> mil, duzentos e trinta e quatro reais e cinquenta e seis centavos".
 */
export const valorPorExtenso = (value: number | null | undefined): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const negativos = amount < 0;
  const totalCentavos = Math.round(Math.abs(amount) * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;

  const extensoReais = extensoInteiro(reais);
  const preposicao = ESCALA_COM_DE.test(extensoReais) ? " de" : "";
  let saida = `${extensoReais}${preposicao} ${reais === 1 ? "real" : "reais"}`;
  if (centavos > 0) {
    saida += ` e ${extensoInteiro(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  }
  return negativos ? `menos ${saida}` : saida;
};
