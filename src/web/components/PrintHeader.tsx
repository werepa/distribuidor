/**
 * Cabeçalho institucional que aparece SOMENTE na impressão.
 * Estilo de documento oficial: brasão centralizado, hierarquia tipográfica,
 * filete duplo, metadados em duas colunas (assunto / contexto).
 */
export function PrintHeader({
  titulo,
  edicao,
  totalLabel,
  total,
  filtroLabel,
}: {
  titulo: string;
  edicao: string;
  totalLabel?: string;   // ex: "Pessoas"
  total?: number;
  filtroLabel?: string;  // ex: "Cargo: APF — Sexo: F"
}) {
  const hoje = new Date();
  const dataFmt = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  });
  const horaFmt = hoje.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="hidden print:block print-header">
      {/* Bloco do brasão */}
      <div className="text-center" style={{ marginBottom: "6mm" }}>
        <img src="/logo.png" alt=""
          style={{ width: "20mm", height: "20mm", objectFit: "contain", display: "inline-block" }} />
        <div style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: "13pt", letterSpacing: "0.18em",
          marginTop: "1.5mm", textTransform: "uppercase"
        }}>
          Polícia Federal
        </div>
        <div style={{
          fontSize: "8.5pt", letterSpacing: "0.22em",
          color: "#444", textTransform: "uppercase"
        }}>
          Academia Nacional de Polícia
        </div>
      </div>

      {/* Filete duplo */}
      <div style={{
        borderTop: "1pt solid #000",
        borderBottom: "0.5pt solid #000",
        height: "2pt",
        marginBottom: "3mm"
      }} />

      {/* Linha de assunto */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: "9pt"
      }}>
        <div>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: "7pt", letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#666"
          }}>
            Assunto
          </span>
          <div style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: "16pt", lineHeight: 1.1, marginTop: "0.5mm"
          }}>
            {titulo}
          </div>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.5 }}>
          <div>
            <span style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "7pt", letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#666"
            }}>
              Edição
            </span>{" "}
            <strong style={{ fontFamily: '"Geist Mono", monospace' }}>{edicao}</strong>
          </div>
          <div>
            <span style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "7pt", letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#666"
            }}>
              Emitido em
            </span>{" "}
            <span style={{ fontFamily: '"Geist Mono", monospace' }}>
              {dataFmt} · {horaFmt}
            </span>
          </div>
          {totalLabel !== undefined && total !== undefined && (
            <div>
              <span style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: "7pt", letterSpacing: "0.18em",
                textTransform: "uppercase", color: "#666"
              }}>
                {totalLabel}
              </span>{" "}
              <strong style={{ fontFamily: '"Geist Mono", monospace' }}>
                {String(total).padStart(3, "0")}
              </strong>
            </div>
          )}
        </div>
      </div>

      {filtroLabel && (
        <div style={{
          fontSize: "8.5pt", marginTop: "2mm",
          color: "#444", fontStyle: "italic",
          fontFamily: '"Instrument Serif", Georgia, serif'
        }}>
          Filtro aplicado: {filtroLabel}
        </div>
      )}

      <div style={{
        borderBottom: "0.75pt solid #000",
        marginTop: "4mm", marginBottom: "5mm"
      }} />
    </div>
  );
}
