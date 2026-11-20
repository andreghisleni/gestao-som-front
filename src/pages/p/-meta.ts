/**
 * Título e descrição da página pública, na camada que roda no navegador.
 *
 * Duas camadas, cada uma para um público:
 *
 * 1. `index.html` (estático): o card que WhatsApp, Telegram, Instagram, Slack e
 *    Teams desenham. Esses robôs NÃO executam JavaScript, então nunca veem nada
 *    daqui — por isso o fixo da marca fica lá.
 * 2. Este arquivo: aba do navegador, Googlebot e qualquer preview que renderize.
 *    Aqui entram os dados do evento, que só existem depois do GET.
 *
 * REGRA DE PRIVACIDADE: título e descrição escapam para o cache do app que
 * gerou o preview e para o histórico/indexador. Valem data e cidade — nunca
 * nome do contratante, CPF/CNPJ, valor acordado, endereço completo ou telefone,
 * mesmo eles estando no DTO (`PublicBudgetDto`).
 */
import { useEffect } from "react";
import { eventDateLabel, shortDateLabel } from "./-form";
import type { PublicBudgetDto } from "./-types";

/** Espelha o `<title>` e o `og:title` estáticos do `index.html`. */
export const BRAND_TITLE = "André Sonorização · Som e Karaokê";
export const BRAND_DESCRIPTION =
  "Confirme os dados do seu evento e assine a proposta pelo celular.";

export type PageMeta = { title: string; description: string };

/** Sem proposta em mãos (carregando/link inválido) = marca pura. */
export function buildEventPageMeta(
  budget?: PublicBudgetDto | null,
): PageMeta {
  if (!budget) {
    return { title: BRAND_TITLE, description: BRAND_DESCRIPTION };
  }

  const when = shortDateLabel(budget.eventDate);
  const city = budget.details?.city?.trim();
  const state = budget.details?.state?.trim();
  const where = city ? `${city}${state ? `/${state}` : ""}` : "";

  const lead = budget.revisionRequest
    ? "Revisão solicitada"
    : budget.submitted
      ? "Resposta enviada"
      : "Sua proposta";

  const tail = [when, where].filter(Boolean).join(" · ");

  return {
    title: tail ? `${lead} · ${tail}` : BRAND_TITLE,
    description: `Sistema de som e karaokê para ${eventDateLabel(
      budget.eventDate,
    )}. Confirme endereço, horários e repertório para a gente fechar o serviço.`,
  };
}

/** Cria a `<meta>` se ela não existir; senão só atualiza o content. */
function upsertMeta(kind: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${kind}="${key}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(kind, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Aplica o meta no documento e devolve o título anterior ao desmontar, para a
 * aba não ficar presa no nome do evento quando o usuário sair da página.
 * `og:url` acompanha a URL real: assim um preview que renderiza JS chaveia por
 * link, e não pelo domínio.
 */
export function useEventPageMeta(meta: PageMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = meta.title;
    upsertMeta("name", "description", meta.description);
    upsertMeta("property", "og:title", meta.title);
    upsertMeta("property", "og:description", meta.description);
    upsertMeta("property", "og:url", window.location.href);
    return () => {
      document.title = previousTitle;
    };
  }, [meta.title, meta.description]);
}
