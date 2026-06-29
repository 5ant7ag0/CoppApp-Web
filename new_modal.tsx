      {verPagareCredito && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in select-none">
          <Card className="w-full max-w-xl bg-white rounded-[2rem] border border-slate-100 p-5 md:p-6 shadow-2xl flex flex-col justify-between relative max-h-[96vh] overflow-y-auto transform transition-all duration-300 animate-scale-up">
            
            <button 
              onClick={() => setVerPagareCredito(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center pb-2.5 border-b border-slate-100">
              <div className="h-10 w-10 rounded-2xl bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center mb-2.5 border border-[#0054A6]/20">
                <Building className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 tracking-tight">Expediente Digital</h3>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                Custodia de Pagarés
              </p>
            </div>

            {/* Selector de Pestañas del Modal */}
            <div className="flex justify-center my-3.5">
              <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-full border border-slate-100/50 flex-row w-full max-w-xs">
                <button
                  onClick={() => setActiveModalTab('pagare')}
                  className="relative flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeModalTab === 'pagare' && (
                    <motion.div
                      layoutId="activeModalTabCredito"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 transition-colors duration-300 ${
                    activeModalTab === 'pagare' ? 'text-white' : 'text-slate-500'
                  }`}>
                    <FileText className="h-3.5 w-3.5" />
                    Pagaré Custodiado
                  </span>
                </button>
                <button
                  onClick={() => setActiveModalTab('amortizacion')}
                  className="relative flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {activeModalTab === 'amortizacion' && (
                    <motion.div
                      layoutId="activeModalTabCredito"
                      className="absolute inset-0 bg-[#0054A6] rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
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
                <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Crédito Nro:</span>
                      <span className="font-extrabold text-slate-700 font-mono">{verPagareCredito.numeroCredito}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Socio:</span>
                      <span className="font-bold text-slate-700 uppercase truncate block" title={verPagareCredito.socio?.nombresCompletos}>
                        {verPagareCredito.socio?.nombresCompletos}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monto Solicitado:</span>
                      <span className="font-extrabold text-[#0054A6] font-mono">{formatCurrency(verPagareCredito.montoSolicitado)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Vigencia:</span>
                      <span className="font-bold text-slate-700 truncate block text-[10px]">
                        {formatFechaStr(verPagareCredito.fechaDesembolso || verPagareCredito.fechaSolicitud)}
                      </span>
                    </div>
                  </div>

                  {/* Previsualización del PDF o Imagen del Pagaré Firmado */}
                  {(() => {
                    const doc = documentosFirmados[verPagareCredito.id];
                    if (!doc || !doc.dataUrl) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-700 font-semibold text-center leading-relaxed">
                          ⚠️ No se detectó un archivo PDF/Imagen adjunto para este crédito. Se visualiza la custodia simulada.
                        </div>
                      );
                    }

                    const isImage = doc.dataUrl.startsWith('data:image/');
                    const isPdf = doc.dataUrl.startsWith('data:application/pdf');

                    return (
                      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50 relative shadow-inner">
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
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Tabla de Amortización Real
                    </span>
                    <span className="text-[10px] text-[#0054A6] font-bold font-mono">
                      Sistema: {verPagareCredito.tipoAmortizacion}
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 max-h-[250px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[8px] font-extrabold text-slate-450 uppercase tracking-wider">
                          <th className="py-2 pl-3">Cuota</th>
                          <th className="py-2">Capital</th>
                          <th className="py-2">Interés</th>
                          <th className="py-2">Total</th>
                          <th className="py-2 pr-3 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-650 font-mono">
                        {tablaAmortizacion.map(cuo => (
                          <tr key={cuo.num} className="hover:bg-slate-50/50">
                            <td className="py-1.5 pl-3 text-slate-400 font-bold">{cuo.num}</td>
                            <td className="py-1.5">{formatCurrency(cuo.capital)}</td>
                            <td className="py-1.5">{formatCurrency(cuo.interes)}</td>
                            <td className="py-1.5 text-slate-800 font-bold">{formatCurrency(cuo.total)}</td>
                            <td className="py-1.5 pr-3 text-right text-slate-400">{formatCurrency(cuo.saldo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 text-center font-medium leading-relaxed pt-2">
                Documentación digital verificada mediante firma física y custodiada en los servidores de la Cooperativa ITQ bajo lineamientos SEPS.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  const doc = documentosFirmados[verPagareCredito.id];
                  if (doc && doc.dataUrl) {
                    const link = document.createElement('a');
                    link.href = doc.dataUrl;
                    link.download = doc.name || `pagare_firmado_${verPagareCredito.numeroCredito}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    descargarPagarePdf(verPagareCredito, tablaAmortizacion, user?.nombresCompletos || 'Oficial');
                  }
                }}
                className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-xl h-10 flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md shadow-blue-805/10"
              >
                <Printer className="h-4 w-4" />
                Imprimir Pagaré
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* Modal: Nueva Solicitud Presencial */}
      {mostrarPresencialModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 no-print select-none">
