import React, { useMemo, useState } from "react";

/**
 * App de canjes por escalas
 * Reglas:
 * - Escala 3: 50 planchas -> 1 premio (peso 12)
 * - Escala 2: 35 planchas -> 1 premio (peso 6)
 * - Escala 1: 10 planchas -> 1 premio (peso 1)
 *
 * Entradas: Planchas compradas, Monto total comprado
 * 
 * Lógica:
 * 1) Se maximiza premios de mayor a menor escala (50 -> 35 -> 10)
 * 2) "Repetir canje" = cantidad de premios en esa escala (floor(planchas/escala))
 * 3) Si queda un sobrante (< tamaño de la escala siguiente), se reparte de forma EQUITATIVA
 *    sobre la ÚLTIMA escala que sí tuvo repeticiones.
 */

const SCALES = [
  { id: 3, name: "Escala 3", size: 50, weight: 12 },
  { id: 2, name: "Escala 2", size: 35, weight: 6 },
  { id: 1, name: "Escala 1", size: 10, weight: 1 },
];

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function useCanjes(planchasInput, montoInput) {
  return useMemo(() => {
    const planchas = Number(planchasInput) || 0;
    const monto = Number(montoInput) || 0;

    if (planchas <= 0 || monto < 0) {
      return {
        unitPrice: 0,
        premios: [],
        aplicativoRows: [],
        totales: { planchas: 0, monto: 0, premios: 0 },
      };
    }

    const unitPrice = monto / planchas;

    // Paso 1: calcular canjes realizados (premios) por escala
    let remaining = planchas;
    const premios = SCALES.map((s) => ({ ...s, count: 0 }));

    for (let i = 0; i < premios.length; i++) {
      const s = premios[i];
      const count = Math.floor(remaining / s.size);
      s.count = count;
      remaining -= count * s.size;
    }

    const totalPremios = premios.reduce((acc, s) => acc + s.count * s.weight, 0);
    const anyCount = premios.some((p) => p.count > 0);

    let aplicativoRows = [];

    if (!anyCount) {
      // Caso extremo: no alcanza ni para 10 planchas
      aplicativoRows = [
        {
          label: "Escala 1",
          repetir: 1,
          planchasPorRep: planchas,
          montoPorRep: planchas * unitPrice,
        },
      ];
    } else {
      // Repartimos el sobrante en la última escala usada
      let lastIdx = -1;
      for (let i = 0; i < premios.length; i++) {
        if (premios[i].count > 0) lastIdx = i;
      }

      premios.forEach((p, idx) => {
        if (p.count === 0) return;
        let planchasPorRep = p.size;
        if (idx === lastIdx && remaining > 0) {
          planchasPorRep = p.size + remaining / p.count;
        }
        aplicativoRows.push({
          label: `${p.name}`,
          repetir: p.count,
          planchasPorRep,
          montoPorRep: planchasPorRep * unitPrice,
        });
      });
    }

    // Totales de control
    const totales = aplicativoRows.reduce(
      (acc, r) => {
        acc.planchas += r.planchasPorRep * r.repetir;
        acc.monto += r.montoPorRep * r.repetir;
        return acc;
      },
      { planchas: 0, monto: 0 }
    );

    return {
      unitPrice,
      premios,
      aplicativoRows,
      totales: {
        planchas: round2(totales.planchas),
        monto: round2(totales.monto),
        premios: totalPremios,
      },
    };
  }, [planchasInput, montoInput]);
}

export default function App() {
  const [planchas, setPlanchas] = useState(75);
  const [monto, setMonto] = useState(7500);

  const { unitPrice, premios, aplicativoRows, totales } = useCanjes(planchas, monto);

  const matchPlanchas =
    Math.abs((Number(planchas) || 0) - (totales.planchas || 0)) < 0.01;
  const matchMonto =
    Math.abs((Number(monto) || 0) - (totales.monto || 0)) < 0.01;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">App de Canjes por Escalas</h1>
          <span className="text-sm opacity-70">
            Optimiza canjes y genera el cuadro del aplicativo
          </span>
        </header>

        {/* Inputs */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <label className="block text-sm font-medium mb-2">
              Planchas compradas
            </label>
            <input
              type="number"
              className="w-full rounded-xl border p-2"
              value={planchas}
              min={0}
              onChange={(e) => setPlanchas(e.target.value)}
            />
            <p className="mt-3 text-xs text-slate-500">Ejemplo: 75</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <label className="block text-sm font-medium mb-2">
              Monto total (S/.)
            </label>
            <input
              type="number"
              className="w-full rounded-xl border p-2"
              value={monto}
              min={0}
              onChange={(e) => setMonto(e.target.value)}
            />
            <p className="mt-3 text-xs text-slate-500">Ejemplo: 7500</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 flex flex-col justify-center">
            <div className="text-sm">Precio por plancha</div>
            <div className="text-2xl font-semibold">
              S/. {round2(unitPrice).toLocaleString()}
            </div>
            <div className="mt-2 text-xs flex flex-wrap gap-2">
              <Badge ok={matchPlanchas}>Planchas cuadran</Badge>
              <Badge ok={matchMonto}>Monto cuadra</Badge>
            </div>
          </div>
        </div>

        {/* Canjes realizados */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">
              Canjes realizados (maximizando premios)
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Escala</th>
                  <th className="py-1">Tamaño</th>
                  <th className="py-1">Premios</th>
                  <th className="py-1">Peso</th>
                  <th className="py-1">Premios × Peso</th>
                </tr>
              </thead>
              <tbody>
                {premios.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 font-medium text-green-700">{p.name}</td>
                    <td className="py-2">{p.size}</td>
                    <td className="py-2">{p.count}</td>
                    <td className="py-2">{p.weight}</td>
                    <td className="py-2 font-semibold">{p.count * p.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-right text-sm">
              <span className="px-3 py-1 rounded-xl bg-yellow-100 text-yellow-800">
                Total Premios:{" "}
                {premios.reduce((a, s) => a + s.count * s.weight, 0)}
              </span>
            </div>
          </div>

          {/* Cuadro aplicativo */}
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Cuadro para el aplicativo</h2>
            {aplicativoRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Ingresa planchas y monto para ver el desglose.
              </p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1">Relevos</th>
                      <th className="py-1">¿Repetir Canje?</th>
                      <th className="py-1">Planchas</th>
                      <th className="py-1">Monto S/.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aplicativoRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2">{r.label}</td>
                        <td className="py-2">{r.repetir}</td>
                        <td className="py-2">{round2(r.planchasPorRep)}</td>
                        <td className="py-2">
                          {round2(r.montoPorRep).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="py-2 text-right" colSpan={2}>
                        Totales
                      </td>
                      <td className="py-2">
                        {round2(
                          aplicativoRows.reduce(
                            (a, r) => a + r.planchasPorRep * r.repetir,
                            0
                          )
                        )}
                      </td>
                      <td className="py-2">
                        {round2(
                          aplicativoRows.reduce(
                            (a, r) => a + r.montoPorRep * r.repetir,
                            0
                          )
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <div className="flex gap-2 mt-4">
                  <CopyButton rows={aplicativoRows} />
                  <DownloadCSVButton rows={aplicativoRows} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Notas */}
        <div className="bg-white rounded-2xl shadow p-4 text-sm text-slate-600">
          <h3 className="font-semibold mb-2">Notas</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>El sistema maximiza siempre de la escala más alta a la más baja.</li>
            <li>
              Si hay sobrante que no completa una escala, se distribuye equitativamente
              en la última escala usada.
            </li>
            <li>
              Los totales del cuadro del aplicativo deben cuadrar con lo digitado
              (chips verdes arriba).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Badge({ ok, children }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs " +
        (ok
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700")
      }
    >
      <span
        className={
          "inline-block w-2 h-2 rounded-full " +
          (ok ? "bg-emerald-500" : "bg-rose-500")
        }
      />
      {children}
    </span>
  );
}

function CopyButton({ rows }) {
  const copy = () => {
    const header = ["Relevos", "¿Repetir Canje?", "Planchas", "Monto S/."].join("\t");
    const body = rows
      .map((r) =>
        [r.label, r.repetir, round2(r.planchasPorRep), round2(r.montoPorRep)].join("\t")
      )
      .join("\n");
    const text = header + "\n" + body;
    navigator.clipboard.writeText(text);
  };
  return (
    <button
      onClick={copy}
      className="px-3 py-2 rounded-xl bg-slate-900 text-white shadow"
    >
      Copiar filas
    </button>
  );
}

function DownloadCSVButton({ rows }) {
  const download = () => {
    const header = ["Relevos", "Repetir", "Planchas", "Monto"].join(",");
    const body = rows
      .map((r) =>
        [r.label, r.repetir, round2(r.planchasPorRep), round2(r.montoPorRep)].join(",")
      )
      .join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aplicativo_canjes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={download}
      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-900 shadow"
    >
      Descargar CSV
    </button>
  );
}
