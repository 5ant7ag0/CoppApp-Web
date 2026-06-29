import re

with open('src/pages/admin/AprobacionCreditos.tsx', 'r') as f:
    content = f.read()

# We need to find the old modal block and replace it.
# It starts with: {/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}
# and ends right before: {/* Modal Split de Previsualización e Impresión (Aesthetic Apple Light) */}

old_modal_start = content.find('{/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}')
split_modal_start = content.find('{/* Modal Split de Previsualización e Impresión (Aesthetic Apple Light) */}')

if old_modal_start == -1 or split_modal_start == -1:
    print("Could not find boundaries for old modal")
    exit(1)

# The new modal (Expediente Digital) starts at: {/* Modal: Visor de Pagaré Firmado Custodiado */}
# and ends right before: {/* Modal: Nueva Solicitud Presencial */}

expediente_start = content.find('{/* Modal: Visor de Pagaré Firmado Custodiado */}')
nueva_solicitud_start = content.find('{/* Modal: Nueva Solicitud Presencial */}')

if expediente_start == -1 or nueva_solicitud_start == -1:
    print("Could not find boundaries for verPagareCredito modal")
    exit(1)

# Now, we need to extract the "body" of the old modal to put it inside the "Informacion General" tab.
old_modal_content = content[old_modal_start:split_modal_start]

# We need to extract just the inner body of old_modal_content.
# The old modal has a header, then grid, then tables, then action buttons.
# Let's extract everything inside the main container.
# Actually, the easiest way to preserve EVERYTHING is to literally take the inside of the old modal
# and put it inside:
# {activeModalTab === 'informacion' ? ( <here> ) : ( amortizacion stuff )}

# Let's construct the unified modal
unified_modal = """
      {/* Modal Unificado Premium (Aesthetic Apple Light) */}
      {creditoSeleccionado && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-4xl bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-2xl flex flex-col justify-between relative max-h-[96vh] overflow-y-auto transform transition-all duration-300 animate-scale-up">
            
            <button 
              onClick={() => setCreditoSeleccionado(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center pb-2.5 border-b border-slate-100">
              <div className="h-10 w-10 rounded-2xl bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center mb-2.5 border border-[#0054A6]/20">
                <Building className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Expediente de Crédito</h3>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                {creditoSeleccionado.numeroCredito}
              </p>
            </div>

            {/* Selector de Pestañas del Modal */}
            <div className="flex justify-center my-3.5">
              <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 flex-row w-full max-w-md">
                <button
                  onClick={() => setActiveModalTab('pagare')}
                  className="relative flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeModalTab === 'pagare' && (
                    <motion.div
                      layoutId="activeModalTabCredito"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-md"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                    activeModalTab === 'pagare' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <FileText className="h-3.5 w-3.5" />
                    Información General
                  </span>
                </button>
                <button
                  onClick={() => setActiveModalTab('amortizacion')}
                  className="relative flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeModalTab === 'amortizacion' && (
                    <motion.div
                      layoutId="activeModalTabCredito"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-md"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                    activeModalTab === 'amortizacion' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <Calendar className="h-3.5 w-3.5" />
                    Tabla Amortización
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3.5 py-2 text-left text-xs flex-1 flex flex-col justify-between">
              {activeModalTab === 'pagare' ? (
                <div className="space-y-4">
                  {/* Contenido de Información (Antiguo Modal) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta 1: Información del Socio */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60">
                        <User className="h-4 w-4 text-[#0054A6]" />
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Datos del Socio</h4>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nombres Completos</span>
                          <span className="font-extrabold text-slate-700 uppercase">{creditoSeleccionado.socio?.nombresCompletos}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificación</span>
                          <span className="font-bold text-slate-700 font-mono">{creditoSeleccionado.socio?.identificacion}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Actividad Económica</span>
                          <span className="font-semibold text-slate-700">{creditoSeleccionado.socio?.actividadEconomica || 'No declarada'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta 2: Resumen Financiero */}
                    <div className="bg-[#0054A6]/[0.02] border border-[#0054A6]/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#0054A6]/10">
                        <Wallet className="h-4 w-4 text-[#0054A6]" />
                        <h4 className="text-[11px] font-bold text-[#0054A6] uppercase tracking-wider">Resumen Financiero</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monto Solicitado</span>
                          <span className="font-black text-xl text-[#0054A6] font-mono leading-none mt-1">{formatCurrency(creditoSeleccionado.montoSolicitado)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plazo</span>
                          <span className="font-bold text-slate-800 mt-1">{creditoSeleccionado.plazoMeses} meses</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistema</span>
                          <span className="font-bold text-slate-800 uppercase text-[11px] mt-1">{creditoSeleccionado.tipoAmortizacion}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tasa (Anual)</span>
                          <span className="font-bold text-slate-800 font-mono mt-1">{creditoSeleccionado.tasaInteresAnual.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#0054A6]/10 flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Garantía / Propósito</span>
                        <p className="text-slate-650 italic text-[11px] leading-relaxed mt-1">{creditoSeleccionado.garantiaDescripcion}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estado y Motivo (Si aplica) */}
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${getEstadoStyles(creditoSeleccionado.estado)}`}>
                      Estado Actual: {getEstadoLabel(creditoSeleccionado.estado)}
                    </span>
                    {creditoSeleccionado.estado === 'RECHAZADO' && creditoSeleccionado.motivoRechazo && (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                        Motivo: {creditoSeleccionado.motivoRechazo}
                      </span>
                    )}
                  </div>

                  {/* Previsualización del PDF Pagaré Firmado (Solo si está desembolsado) */}
                  {creditoSeleccionado.estado === 'DESEMBOLSADO' && (
                    <div className="mt-4 border border-slate-200 rounded-3xl overflow-hidden bg-slate-50 relative shadow-inner">
                      {(() => {
                        const doc = documentosFirmados[creditoSeleccionado.id];
                        if (!doc || !doc.dataUrl) {
                          return (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-700 font-semibold text-center leading-relaxed">
                              ⚠️ No se detectó un archivo adjunto para este crédito. Se visualiza la custodia simulada.
                            </div>
                          );
                        }

                        const isImage = doc.dataUrl.startsWith('data:image/');
                        const isPdf = doc.dataUrl.startsWith('data:application/pdf');

                        return (
                          <>
                            {isImage ? (
                              <div className="max-h-[250px] overflow-y-auto w-full flex justify-center p-2 bg-slate-50">
                                <img 
                                  src={doc.dataUrl} 
                                  alt={doc.name} 
                                  className="max-h-[230px] object-contain rounded-lg border border-slate-100 shadow-sm animate-scale-up"
                                />
                              </div>
                            ) : isPdf ? (
                              <div className="w-full h-[250px] bg-slate-100 relative">
                                <iframe 
                                  src={doc.dataUrl} 
                                  title={doc.name}
                                  className="w-full h-full border-0 rounded-2xl"
                                />
                              </div>
                            ) : (
                              <div className="p-6 bg-slate-50 text-center space-y-2">
                                <FileText className="h-10 w-10 text-slate-455 mx-auto" />
                                <span className="text-xs font-bold text-slate-700 block">{doc.name}</span>
                                <a 
                                  href={doc.dataUrl} 
                                  download={doc.name}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Descargar Archivo
                                </a>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Acciones de Seguridad RBAC */}
                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    {/* Acciones para EN_REVISION (Rol: Comité / Oficiales NO Contadores) */}
                    {creditoSeleccionado.estado === 'EN_REVISION' && !isContador && (
                      <div className="flex w-full gap-4 animate-fade-in">
                        <Button
                          onClick={() => setMostrarRechazoModal(true)}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 border border-rose-200 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => setMostrarAprobacionModal(true)}
                          className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-800/10"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar Crédito
                        </Button>
                      </div>
                    )}

                    {/* Controles para Créditos en APROBADO (Rol: Contabilidad / Desembolsos) */}
                    {creditoSeleccionado.estado === 'APROBADO' && (
                      <div className="flex w-full animate-fade-in">
                        {isContador ? (
                          <Button
                            onClick={() => {
                              setPagareCredito(creditoSeleccionado);
                              setCreditoSeleccionado(null);
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-800/10"
                          >
                            <ArrowRight className="h-4 w-4" />
                            Continuar a Desembolso
                          </Button>
                        ) : (
                          <div className="w-full text-center p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                            Pendiente de Desembolso por Contabilidad
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botón Imprimir Pagaré si está DESEMBOLSADO */}
                    {creditoSeleccionado.estado === 'DESEMBOLSADO' && (
                      <div className="flex w-full animate-fade-in">
                        <Button
                          onClick={() => {
                            const doc = documentosFirmados[creditoSeleccionado.id];
                            if (doc && doc.dataUrl) {
                              const link = document.createElement('a');
                              link.href = doc.dataUrl;
                              link.download = doc.name || `pagare_firmado_${creditoSeleccionado.numeroCredito}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              descargarPagarePdf(creditoSeleccionado, tablaAmortizacion, user?.nombresCompletos || 'Oficial');
                            }
                          }}
                          className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-blue-805/10"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir / Descargar Pagaré
                        </Button>
                      </div>
                    )}

                    {/* Si está rechazado, solo permitir cerrar */}
                    {(creditoSeleccionado.estado === 'RECHAZADO' || creditoSeleccionado.estado === 'SOLICITADO') && (
                      <div className="flex w-full">
                        <Button
                          onClick={() => setCreditoSeleccionado(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2"
                        >
                          Cerrar Detalles
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Tabla de Amortización {creditoSeleccionado.estado === 'DESEMBOLSADO' ? 'Real' : 'Simulada'}
                    </span>
                    <span className="text-[10px] text-[#0054A6] font-bold font-mono">
                      Sistema: {creditoSeleccionado.tipoAmortizacion}
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[8px] font-extrabold text-slate-450 uppercase tracking-wider sticky top-0">
                          <th className="py-2 pl-3">Cuota</th>
                          <th className="py-2">Capital</th>
                          <th className="py-2">Interés</th>
                          <th className="py-2">Total</th>
                          <th className="py-2 pr-3 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-650 font-mono">
                        {cargandoAmortizacion ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0054A6]" />
                              Proyectando amortización...
                            </td>
                          </tr>
                        ) : tablaAmortizacion.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No hay cuotas disponibles
                            </td>
                          </tr>
                        ) : (
                          tablaAmortizacion.map(cuo => (
                            <tr key={cuo.num} className="hover:bg-slate-50/50">
                              <td className="py-1.5 pl-3 text-slate-400 font-bold">{cuo.num}</td>
                              <td className="py-1.5">{formatCurrency(cuo.capital)}</td>
                              <td className="py-1.5">{formatCurrency(cuo.interes)}</td>
                              <td className="py-1.5 text-slate-800 font-bold">{formatCurrency(cuo.total)}</td>
                              <td className="py-1.5 pr-3 text-right text-slate-400">{formatCurrency(cuo.saldo)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => descargarTablaAmortizacionPdf(creditoSeleccionado, tablaAmortizacion)}
                      disabled={cargandoAmortizacion || tablaAmortizacion.length === 0}
                      className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Tabla de Amortización
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
"""

# Now we replace the old content with the new unified modal, and delete the verPagareCredito modal.
new_content = content[:old_modal_start] + unified_modal + content[split_modal_start:expediente_start] + content[nueva_solicitud_start:]

with open('src/pages/admin/AprobacionCreditos.tsx', 'w') as f:
    f.write(new_content)

print("Refactor complete.")
