/**
 * Recibo em PDF — o desenho da página, na biblioteca `@react-pdf/renderer`.
 *
 * Este arquivo é o único que importa o @react-pdf, e ele chega aqui por
 * `import()` dinâmico feito pelo botão: quem abre a tela do orçamento não
 * baixa a biblioteca de PDF até pedir um recibo de verdade. A outra metade —
 * os textos, em `receipt-model.ts` — é puro e não depende de PDF nenhum.
 *
 * O layout segue o modelo que você anexou: título verde com filete, caixa de
 * VALOR, três parágrafos com os destaques em negrito, local/data alinhados à
 * direita e a linha de assinatura com nome e CPF.
 */
/** biome-ignore-all lint/suspicious/useAwait: <explanation> */
import {
  Document,
  Font,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatarDocumento } from "@/utils/brDocuments";
import { formatToBRL } from "@/utils/formatToBRL";
import { valorPorExtenso } from "@/utils/valorPorExtenso";
import type { ReceiptData } from "./receipt-model";

// O react-pdf traz dicionário de separação silábica INGLÊS; num texto em
// português ele quebraria "forneci-dos", "recebi-mento". Sem quebra, a
// justificação continua e quem escrever uma palavra sem espaço não rasga a
// linha — ela simplesmente passa para a seguinte.
Font.registerHyphenationCallback((word) => [word]);

const CORES = {
  tinta: "#111111",
  verde: "#2E6B4F",
  verdeCaixa: "#EAF3EE",
  linha: "#333333",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 72,
    fontSize: 11,
    lineHeight: 1.55,
    color: CORES.tinta,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: CORES.verde,
    letterSpacing: 2,
  },
  titleRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: CORES.verde,
    marginTop: 8,
    marginBottom: 26,
  },
  valueBox: {
    borderWidth: 1,
    borderColor: CORES.verde,
    backgroundColor: CORES.verdeCaixa,
    paddingVertical: 11,
    marginBottom: 28,
  },
  valueText: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 16,
  },
  strong: {
    fontWeight: "bold",
  },
  /** No modelo, "som, luz e vídeo" vem aberto — é a única parte com entrelinha. */
  strongWide: {
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  place: {
    textAlign: "right",
    marginTop: 32,
  },
  signature: {
    alignItems: "center",
    marginTop: 74,
  },
  signatureLine: {
    width: 300,
    borderTopWidth: 1,
    borderTopColor: CORES.linha,
    marginBottom: 8,
  },
  signatureName: {
    fontWeight: "bold",
  },
  signatureDoc: {
    marginTop: 2,
  },
});

export function ReceiptPdfDocument({ data }: { data: ReceiptData }) {
  const amountLabel = formatToBRL(data.amount);
  const amountWords = valorPorExtenso(data.amount);
  const issuerDoc = data.issuerCpf ? formatarDocumento(data.issuerCpf) : "";

  return (
    <Document
      author={data.issuerName}
      creator="Vortex"
      keywords="recibo, aluguel de som"
      producer="Vortex"
      subject="Recibo de aluguel de equipamentos"
      title={`Recibo - ${data.payerName}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>RECIBO</Text>
        <View style={styles.titleRule} />

        <View style={styles.valueBox}>
          <Text style={styles.valueText}>{`VALOR: ${amountLabel}`}</Text>
        </View>

        <Text style={styles.paragraph}>
          {"Eu, "}
          <Text style={styles.strong}>{data.issuerName}</Text>
          {issuerDoc ? (
            <>
              {", inscrito no CPF sob o nº "}
              <Text style={styles.strong}>{issuerDoc}</Text>
            </>
          ) : null}
          {", declaro ter recebido "}
          {data.payerName ? (
            <>
              {"de "}
              <Text style={styles.strong}>{data.payerName}</Text>
              {data.payerDoc ? (
                <>
                  {", "}
                  <Text style={styles.strong}>
                    {`${data.payerDocLabel} ${data.payerDoc}`}
                  </Text>
                  {", a importância de "}
                </>
              ) : (
                " a importância de "
              )}
            </>
          ) : (
            "a importância de "
          )}
          <Text style={styles.strong}>{`${amountLabel} (${amountWords})`}</Text>
          {"."}
        </Text>

        <Text style={styles.paragraph}>
          {"O referido valor é correspondente ao aluguel de equipamentos de "}
          <Text style={styles.strongWide}>{data.service}</Text>
          {" fornecidos para o evento "}
          <Text style={styles.strong}>{data.eventLine}</Text>
          {data.period ? `, ${data.period}` : ""}
          {"."}
        </Text>

        <Text style={styles.paragraph}>
          {
            "Para maior clareza, firmo o presente recibo dando plena e geral quitação do valor descrito."
          }
        </Text>

        <Text style={styles.place}>
          {data.cityState ? `${data.cityState}, ` : ""}
          {data.issueDate}
          {"."}
        </Text>

        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{data.issuerName}</Text>
          {issuerDoc ? (
            <Text style={styles.signatureDoc}>{`CPF: ${issuerDoc}`}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

/** Gera o PDF em memória; o botão transforma em download. */
export async function renderReceiptBlob(data: ReceiptData): Promise<Blob> {
  return pdf(<ReceiptPdfDocument data={data} />).toBlob();
}
