import re

with open('src/pages/admin/CreacionSocios.tsx', 'r') as f:
    creacion = f.read()

with open('src/pages/admin/AprobacionCreditos.tsx', 'r') as f:
    apro = f.read()

# 1. Modify activeModalTab state to default to 'detalles'
apro = apro.replace("useState<'pagare' | 'amortizacion'>('pagare');", "useState<'detalles' | 'amortizacion'>('detalles');")
apro = apro.replace("setActiveModalTab('pagare');", "setActiveModalTab('detalles');")

# 2. Re-write the creditoSeleccionado modal layout
start_marker = "{/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}"
end_marker = "{/* END Modal Centrado y Flotante Premium */}"

# Let's find where the modal ends.
# It ends with </div></div></div>)} then the "Ver Pagaré" modal starts.
next_modal_marker = "{/* Modal: Visor de Pagaré Firmado Custodiado */}"

idx_start = apro.find(start_marker)
idx_end = apro.find(next_modal_marker, idx_start)

modal_block = apro[idx_start:idx_end]

# Split the modal block into Header, Error alerts, and Body.
header_end = modal_block.find("{/* Cuerpo de Dos Columnas */}")

# We will replace the header with the new tab header
new_header = """
      {/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}
      {creditoSeleccionado && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in select-none no-print">
          
          <div className="w-full max-w-4xl bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-5 md:p-6 pb-6 flex flex-col justify-between max-h-[96vh] overflow-y-auto transform transition-all duration-300 relative animate-scale-up">
            
            {/* Header del Modal con Pestañas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-lg border uppercase tracking-wider mb-1.5 ${getEstadoStyles(creditoSeleccionado.estado)}`}>
                  {getEstadoLabel(creditoSeleccionado.estado)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                  Ficha de Evaluación: {creditoSeleccionado.numeroCredito}
                </h3>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Selector de Pestañas (Pill-shaped) */}
                <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50">
                  <button
                    onClick={() => setActiveModalTab('detalles')}
                    className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
                  >
                    {activeModalTab === 'detalles' && (
                      <motion.div
                        layoutId="activeTabCredito"
                        className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                      activeModalTab === 'detalles' ? 'text-white' : 'text-slate-500'
                    }`}>
                      <FileText className="h-3.5 w-3.5" />
                      Detalles
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('amortizacion')}
                    className="relative px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-805"
                  >
                    {activeModalTab === 'amortizacion' && (
                      <motion.div
                        layoutId="activeTabCredito"
                        className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                      activeModalTab === 'amortizacion' ? 'text-white' : 'text-slate-500'
                    }`}>
                      <List className="h-3.5 w-3.5" />
                      Tabla de Amortización
                    </span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  <button
                    onClick={() => descargarAmortizacionPdf(creditoSeleccionado, creditoSeleccionado.socio || null)}
                    className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-[#0054A6] hover:bg-[#0054A6]/10 transition-all focus:outline-none cursor-pointer flex items-center justify-center tooltip-trigger"
                    title="Imprimir Tabla de Amortización"
                  >
                    <Printer className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => descargarPagarePdf(creditoSeleccionado, creditoSeleccionado.socio || null)}
                    className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:text-[#0054A6] hover:bg-[#0054A6]/10 transition-all focus:outline-none cursor-pointer flex items-center justify-center tooltip-trigger"
                    title="Ver Pagaré Firmado"
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (!isDisbursing) {
                        setCreditoSeleccionado(null);
                      }
                    }}
                    disabled={isDisbursing}
                    className="ml-2 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Alerta de bloqueo por desembolso */}
            {isDisbursing && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-[#0054A6]" />
                <div className="text-xs text-blue-700 font-bold">
                  Procesando Aprobación y Desembolso... No cierre esta ventana ni interrumpa la operación.
                </div>
              </div>
            )}

            {/* Error de desembolso crítico */}
            {disburseError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-800 uppercase">Error de Desembolso Contable</h4>
                  <p className="text-xs text-red-600 leading-relaxed font-medium">{disburseError}</p>
                </div>
              </div>
            )}
"""

# Extract the body of the original modal
body_start = modal_block.find("{/* Cuerpo de Dos Columnas */}")
body_end = modal_block.find("</div>\n        </div>\n      )}")

old_body = modal_block[body_start:body_end]

# We need to wrap the old body in {activeModalTab === 'detalles' && ( <old_body> )}
new_body_detalles = "            {activeModalTab === 'detalles' && (\n              <div className=\"animate-fade-in\">\n" + old_body + "\n              </div>\n            )}\n"

# Amortization Table content
# I will synthesize it based on CreacionSocios.tsx lines 3782-3850
table_logic = """
            {activeModalTab === 'amortizacion' && (
              <div className="animate-fade-in flex-1 overflow-hidden flex flex-col">
                <div className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm flex-1 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Detalle de Amortización — Sistema: {creditoSeleccionado.tipoAmortizacion || 'FRANCES'}
                    </h5>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      Plazo: {creditoSeleccionado.plazoMeses} Meses | Tasa: {parseFloat(creditoSeleccionado.tasaInteresAnual as any || 0).toFixed(2)}%
                    </span>
                  </div>

                  {!tablaAmortizacion || tablaAmortizacion.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-10">
                      {cargandoAmortizacion ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">No se registra cronograma de pagos para este crédito.</span>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl max-h-[500px]">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[12%]">Cuota</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[18%]">Vencimiento</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Capital</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Interés</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[14%]">Total</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[16%]">Saldo Restante</th>
                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[12%] text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(() => {
                            let runningBalance = parseFloat(creditoSeleccionado.montoDesembolsado || creditoSeleccionado.montoSolicitado || 0);
                            return tablaAmortizacion.map((cuota, index) => {
                              runningBalance -= parseFloat(cuota.capitalProyectado || 0);
                              const isPagada = cuota.estado === 'PAGADA';
                              return (
                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 text-[10px] font-extrabold text-slate-600 font-mono">
                                    #{cuota.numeroCuota}
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-semibold text-slate-500 font-mono">
                                    {cuota.fecha}
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                    ${parseFloat(cuota.capitalProyectado || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                    ${parseFloat(cuota.interesProyectado || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-black text-slate-700 font-mono">
                                    ${parseFloat(cuota.cuotaTotal || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 font-mono">
                                    ${Math.max(0, runningBalance).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                                      isPagada ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {isPagada ? '✓ PAGADA' : '○ PENDIENTE'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
"""

complete_new_modal = new_header + new_body_detalles + table_logic + "\n          </div>\n        </div>\n      )}\n"

new_content = apro[:idx_start] + complete_new_modal + "\n      " + apro[idx_end:]

with open('src/pages/admin/AprobacionCreditos.tsx', 'w') as f:
    f.write(new_content)
    print("Success: AprobacionCreditos updated with 2-tabs layout!")
