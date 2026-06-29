      {/* Modal Centrado y Flotante Premium (Aesthetic Apple Light) */}
      {creditoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in select-none no-print">
          
          {/* Contenedor del Modal Redondeado */}
          <div className="w-full max-w-4xl bg-white shadow-2xl border border-slate-100 rounded-[2rem] p-5 md:p-6 pb-6 flex flex-col justify-between max-h-[96vh] overflow-y-auto transform transition-all duration-300 relative animate-scale-up">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-lg border uppercase tracking-wider mb-1.5 ${getEstadoStyles(creditoSeleccionado.estado)}`}>
                  {getEstadoLabel(creditoSeleccionado.estado)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                  Ficha de Evaluación: {creditoSeleccionado.numeroCredito}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!isDisbursing) {
                    setCreditoSeleccionado(null);
                  }
                }}
                disabled={isDisbursing}
                className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
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

            {/* Cuerpo de Dos Columnas */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              
              {/* Columna Izquierda: Perfil de Riesgo */}
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Perfil del Socio Solicitante
                  </h4>
                  
                  {/* Datos Básicos */}
                  <Card className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 shadow-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Socio:</span>
                      <span className="font-extrabold text-slate-700 uppercase">{creditoSeleccionado.socio?.nombresCompletos}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Cédula:</span>
                      <span className="font-bold text-slate-700 font-mono">{creditoSeleccionado.socio?.identificacion}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Actividad Económica:</span>
                      <span className="font-semibold text-slate-700">{creditoSeleccionado.socio?.actividadEconomica || 'No declarada'}</span>
                    </div>
                  </Card>
                </div>

                {/* Score Crediticio (Media Dona Gauge SVG) */}
                <Card className="rounded-3xl border border-slate-100 p-4 shadow-sm bg-white space-y-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Score de Buró Crediticio
                  </h5>
                  <div className="relative flex flex-col items-center">
                    {(() => {
                      const scoreVal = getCreditScore(creditoSeleccionado.socio, cuotaProyectada);
                      const percent = Math.min(100, Math.max(0, ((scoreVal - 300) / 700) * 100));
                      
                      let strokeColor = '#EF4444';
                      let scoreLabel = 'RIESGO ALTO';
                      let scoreClass = 'text-rose-500';
                      
                      if (scoreVal >= 600 && scoreVal < 800) {
                        strokeColor = '#F59E0B';
                        scoreLabel = 'RIESGO MEDIO';
                        scoreClass = 'text-amber-500';
                      } else if (scoreVal >= 800) {
                        strokeColor = '#10B981';
                        scoreLabel = 'EXCELENTE';
                        scoreClass = 'text-emerald-500';
                      }
                      
                      const offsetVal = 251.3 - (percent / 100) * 251.3;
                      
                      return (
                        <>
                          <svg viewBox="0 0 200 110" className="w-full max-w-[160px] mx-auto">
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="transparent"
                              stroke="#F1F5F9"
                              strokeWidth="12"
                              strokeDasharray="251.3 502.6"
                              transform="rotate(-180 100 100)"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="transparent"
                              stroke={strokeColor}
                              strokeWidth="12"
                              strokeDasharray="251.3 502.6"
                              strokeDashoffset={offsetVal}
                              transform="rotate(-180 100 100)"
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                            <text x="100" y="80" textAnchor="middle" className="text-3xl font-black fill-slate-800 tracking-tight font-sans">
                              {scoreVal}
                            </text>
                            <text x="100" y="98" textAnchor="middle" className={`text-[8px] font-black tracking-widest uppercase fill-current ${scoreClass} font-sans`}>
                              {scoreLabel}
                            </text>
                          </svg>
                          <div className="text-[9px] text-slate-400 font-semibold text-center mt-1">
                            Rango de Calificación SEPS (300 a 1000)
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>

                {/* Ingresos y Gastos con formateador de moneda */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Ingresos y Gastos Declarados
                  </h4>

                  <Card className="rounded-3xl border border-slate-100 p-4 space-y-3 shadow-sm bg-white">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Ingresos Mensuales (+):
                      </span>
                      <span className="font-bold text-emerald-600 font-mono text-sm">
                        {formatCurrency(Number(ingresos))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <Ban className="h-4 w-4 text-rose-500" />
                        Gastos Mensuales (-):
                      </span>
                      <span className="font-bold text-rose-600 font-mono text-sm">
                        {formatCurrency(Number(gastos))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 pb-2.5">
                      <span className="text-slate-550 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-slate-400" />
                        Otras Deudas Actuales:
                      </span>
                      <span className="font-bold text-slate-600 font-mono">
                        {formatCurrency(Number(deudas))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-800 text-xs font-black uppercase tracking-wider">
                        Flujo Neto Mensual:
                      </span>
                      <span className={`font-black font-mono text-base ${flujoNeto > 0 ? 'text-[#0054A6]' : 'text-rose-600'}`}>
                        {formatCurrency(flujoNeto)}
                      </span>
                    </div>
                  </Card>

                  {/* Banner de Advertencia del 40% */}
                  {superaCapacidad && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-3xl flex gap-3 items-start animate-fade-in">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">Alerta de Capacidad de Pago</h4>
                        <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                          Alto riesgo de impago: La cuota proyectada de {formatCurrency(cuotaProyectada)} representa el{' '}
                          {flujoNeto > 0 ? porcentajeCapacidad.toFixed(1) : '100+'}% del flujo neto mensual. Supera la capacidad de pago SEPS (límite del 40%).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Motivo de rechazo previo */}
                {creditoSeleccionado.estado === 'RECHAZADO' && creditoSeleccionado.motivoRechazo && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Historial de Resolución
                    </h4>
                    <div className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-1">Motivo de Rechazo:</span>
                      <p className="text-xs text-rose-700 font-bold leading-relaxed">{creditoSeleccionado.motivoRechazo}</p>
                    </div>
                  </div>
                )}

                {/* Notas Internas / Bitácora */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Notas Internas / Bitácora
                  </h4>
                  <textarea
                    placeholder="Escriba comentarios o notas de seguimiento del crédito aquí (se autoguarda)..."
                    value={notasCredito[creditoSeleccionado.id] || ''}
                    onChange={(e) => handleNotaChange(creditoSeleccionado.id, e.target.value)}
                    rows={4}
                    className="w-full text-xs font-semibold text-slate-700 placeholder-slate-400 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]/60 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Columna Derecha: Proyección Financiera */}
              <div className="space-y-4 flex flex-col justify-between">
                
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Proyección Financiera
                  </h4>

                  <Card className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5 shadow-none">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Monto Solicitado:</span>
                      <span className="font-extrabold text-slate-800 font-mono">{formatCurrency(creditoSeleccionado.montoSolicitado)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Sistema Amortización:</span>
                      <span className="font-bold text-slate-800 uppercase text-[11px]">{creditoSeleccionado.tipoAmortizacion}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Tasa Interés Anual:</span>
                      <span className="font-bold text-slate-800 font-mono">{creditoSeleccionado.tasaInteresAnual.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-medium">Plazo:</span>
                      <span className="font-bold text-slate-800">{creditoSeleccionado.plazoMeses} meses</span>
                    </div>
                    <div className="flex justify-between items-start text-xs flex-col gap-1 border-t border-slate-100 pt-2.5">
                      <span className="text-slate-450 font-semibold">Garantía / Justificación:</span>
                      <p className="text-slate-650 italic text-[11px] leading-relaxed">{creditoSeleccionado.garantiaDescripcion}</p>
                    </div>
                  </Card>
                </div>

                {/* Tabla de Amortización con Skeleton Loader */}
                <div className="space-y-2.5 flex-1 flex flex-col pt-1">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                    Tabla de Amortización {creditoSeleccionado.estado === 'DESEMBOLSADO' ? 'Real' : 'Simulada'}
                  </h4>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 flex-1 max-h-[220px] overflow-y-auto">
                    {cargandoAmortizacion ? (
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <div className="h-3 w-10 bg-slate-200/50 rounded" />
                          <div className="h-3 w-16 bg-slate-200/50 rounded" />
                          <div className="h-3 w-16 bg-slate-200/50 rounded" />
                          <div className="h-3 w-16 bg-slate-200/50 rounded" />
                        </div>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex justify-between items-center animate-pulse py-1.5">
                            <div className="h-3 w-6 bg-slate-100 rounded" />
                            <div className="h-3 w-14 bg-slate-100 rounded" />
                            <div className="h-3 w-14 bg-slate-100 rounded" />
                            <div className="h-3 w-16 bg-slate-100 rounded" />
                            <div className="h-3 w-14 bg-slate-100 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">
                            <th className="py-2.5 pl-3">Cuota</th>
                            <th className="py-2.5">Capital</th>
                            <th className="py-2.5">Interés</th>
                            <th className="py-2.5">Cuota Total</th>
                            <th className="py-2.5 pr-3 text-right">Saldo Restante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-650 font-mono">
                          {tablaAmortizacion.map(cuo => (
                            <tr key={cuo.num} className="hover:bg-slate-50/50">
                              <td className="py-2 pl-3 text-slate-400 font-bold">{cuo.num}</td>
                              <td className="py-2">{formatCurrency(cuo.capital)}</td>
                              <td className="py-2">{formatCurrency(cuo.interes)}</td>
                              <td className="py-2 text-slate-800 font-bold">{formatCurrency(cuo.total)}</td>
                              <td className="py-2 pr-3 text-right text-slate-400">{formatCurrency(cuo.saldo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer de Resoluciones (Botones de Cierre) */}
            <div className="border-t border-slate-100 pt-6 flex gap-4 w-full">
              
              {(creditoSeleccionado.estado === 'SOLICITADO' || creditoSeleccionado.estado === 'EN_REVISION') && (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {!isContador && (
                    <>
                      {/* Botón Rechazar */}
                      <Button
                        onClick={() => setMostrarRechazoModal(true)}
                        disabled={isDisbursing}
                        className="flex-1 bg-rose-50/80 hover:bg-rose-600 border border-rose-200/60 text-rose-700 hover:text-white font-bold rounded-2xl h-11 text-xs cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:shadow-md hover:shadow-rose-600/10"
                      >
                        <Ban className="h-4 w-4" />
                        Rechazar Solicitud
                      </Button>

                      {/* Botón Aprobar Solicitud */}
                      <Button
                        onClick={triggerAprobarCreditoConfirm}
                        disabled={isApproving || isDisbursing}
                        className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-2xl h-11 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-800/10 disabled:opacity-50"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Aprobar Solicitud
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Botón Imprimir Tabla de Amortización */}
                  <Button
                    onClick={() => descargarTablaAmortizacionPdf(creditoSeleccionado, tablaAmortizacion)}
                    disabled={cargandoAmortizacion || isDisbursing}
                    className="flex-1 bg-white border border-slate-200 hover:bg-blue-50/60 text-slate-650 hover:text-[#0054A6] hover:border-blue-200 font-bold rounded-2xl h-11 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Tabla de Amortización
                  </Button>
                </div>
              )}

              {/* Controles para Créditos en APROBADO */}
              {creditoSeleccionado.estado === 'APROBADO' && (
                <div className="flex w-full gap-4 animate-fade-in">
                  {/* Botón Desembolsar Fondos */}
                  {!isContador && (
                    <Button
                      onClick={() => handleImprimirPagare(creditoSeleccionado)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Desembolsar Fondos
                    </Button>
                  )}

                  {/* Botón Imprimir Tabla de Amortización */}
                  <Button
                    onClick={() => {
                      descargarTablaAmortizacionPdf(creditoSeleccionado, tablaAmortizacion);
                    }}
                    disabled={cargandoAmortizacion}
                    className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-800/10 disabled:opacity-50"
                  >
                    {cargandoAmortizacion ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir Tabla de Amortización
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Controles para Créditos en DESEMBOLSADO */}
              {creditoSeleccionado.estado === 'DESEMBOLSADO' && (
                <div className="flex w-full gap-4 animate-fade-in">
                  {/* Botón Ver Pagaré Firmado */}
                  <Button
                    onClick={() => {
                      setVerPagareCredito(creditoSeleccionado);
                      setActiveModalTab('pagare');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Pagaré Firmado
                  </Button>

                  {/* Botón Imprimir Tabla de Amortización */}
                  <Button
                    onClick={() => {
                      descargarTablaAmortizacionPdf(creditoSeleccionado, tablaAmortizacion);
                    }}
                    disabled={cargandoAmortizacion}
                    className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-800/10 disabled:opacity-50"
                  >
                    {cargandoAmortizacion ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir Tabla de Amortización
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Acciones para Rechazados */}
              {creditoSeleccionado.estado === 'RECHAZADO' && (
                <div className="flex w-full">
                  <Button
                    onClick={() => setCreditoSeleccionado(null)}
                    className="flex-1 bg-[#0054A6] hover:bg-[#0054A6]/90 text-white font-bold rounded-2xl h-11 text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-850/10"
                  >
                    Cerrar Ficha de Detalle
                  </Button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
