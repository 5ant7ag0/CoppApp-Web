import React from 'react';
import { Loader2 } from 'lucide-react';

interface TablaAmortizacionProps {
  credito: {
    numeroCredito?: string;
    fechaSolicitud?: string;
    montoSolicitado?: string | number;
    estado: string;
    [key: string]: any;
  } | null;
  cuotas: Array<{
    num: number;
    fecha: string;
    capital: string | number;
    interes: string | number;
    total: string | number;
    saldo: string | number;
    estado: string;
  }> | null;
  isLoading?: boolean;
  mostrarResumenSuperior?: boolean;
  isEmbedded?: boolean;
}

const formatCurrency = (val: number | string | undefined | null) => {
  const v = Number(val) || 0;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatFechaStr = (dateStr?: any) => {
  if (!dateStr) return 'N/A';
  try {
    const str = String(dateStr);
    if (str.includes('-')) {
      const parts = str.split('T')[0].split('-');
      if (parts.length >= 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateStr);
  }
};

export const TablaAmortizacion: React.FC<TablaAmortizacionProps> = ({ 
  credito, 
  cuotas, 
  isLoading = false,
  mostrarResumenSuperior = true,
  isEmbedded = false
}) => {

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#0054A6]" />
        <span className="text-sm font-bold text-slate-400">Cargando tabla de amortización...</span>
      </div>
    );
  }

  if (!credito) {
    return (
      <div className="flex-1 flex items-center justify-center py-10">
        <span className="text-sm text-slate-400 font-medium">No hay información del crédito seleccionada.</span>
      </div>
    );
  }

  const TableContent = (
    <>
      {/* Encabezado Premium Resumen */}
      {mostrarResumenSuperior && !isEmbedded && (
          <div className="mb-4 bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">N° CRÉDITO</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">FECHA SOLICITUD</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">MONTO</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">SALDO DEUDOR</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">PRÓXIMO VENCIMIENTO</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">ESTADO</th>
                </tr>
              </thead>
              <tbody className="bg-slate-50/20">
                {(() => {
                  const nextCuota = cuotas?.find((c) => c.estado !== 'PAGADA');
                  const saldoDeudor = nextCuota ? (Number(nextCuota.saldo) + Number(nextCuota.capital)) : 0;
                  
                  const isMora = cuotas?.some((c) => c.estado === 'MORA' || c.estado === 'EN_MORA');
                  const isCancelado = credito.estado === 'CANCELADO' || (cuotas && cuotas.length > 0 && !nextCuota);
                  
                  let estadoLabel = 'AL DÍA';
                  let estadoStyles = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                  if (isCancelado) {
                    estadoLabel = 'LIQUIDADO';
                    estadoStyles = 'bg-slate-100 text-slate-600 border border-slate-200';
                  } else if (isMora) {
                    estadoLabel = 'EN MORA';
                    estadoStyles = 'bg-rose-50 text-rose-600 border border-rose-100';
                  }

                  return (
                    <tr>
                      <td className="px-4 py-4 text-[13px] font-extrabold text-[#0054A6] font-mono text-center">{credito.numeroCredito || 'S/N'}</td>
                      <td className="px-4 py-4 text-[13px] font-semibold text-slate-600 font-mono text-center">{formatFechaStr(credito.fechaSolicitud)}</td>
                      <td className="px-4 py-4 text-[13px] font-bold text-slate-800 font-mono text-center">{formatCurrency(credito.montoSolicitado)}</td>
                      <td className="px-4 py-4 text-[13px] font-bold text-slate-800 font-mono text-center">{formatCurrency(saldoDeudor)}</td>
                      <td className="px-4 py-3 text-center">
                        {nextCuota ? (
                          <>
                            <span className="text-[13px] font-bold text-slate-800 font-mono block">{formatCurrency(nextCuota.total)}</span>
                            <span className="text-[11px] text-slate-400 font-medium block">Vence: {['SOLICITADO', 'EN_ANALISIS', 'APROBADO', 'EN_REVISION'].includes(credito.estado) ? 'Al desembolsar' : formatFechaStr(nextCuota.fecha)}</span>
                          </>
                        ) : (
                          <span className="text-[13px] font-bold text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1.5 text-[10px] font-black rounded-md uppercase tracking-wider ${estadoStyles}`}>
                          {estadoLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {!cuotas || cuotas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <span className="text-sm text-slate-400 font-medium">No se registra cronograma de pagos para este crédito.</span>
        </div>
      ) : (
        <div className={isEmbedded ? "w-full overflow-x-auto" : "overflow-y-auto flex-1 border border-slate-100 rounded-xl max-h-[500px]"}>
          <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Cuota</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Vencimiento</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Capital</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Interés</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Saldo Restante</th>
                  <th className="px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cuotas.map((cuo, index) => {
                  const isPagada = cuo.estado === 'PAGADA';
                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-[12px] font-extrabold text-slate-600 font-mono text-center">
                        #{cuo.num}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-slate-500 font-mono text-center whitespace-nowrap">
                        {['SOLICITADO', 'EN_ANALISIS', 'APROBADO', 'EN_REVISION'].includes(credito.estado) ? <span className="text-[11px] italic text-slate-400">Al desembolsar</span> : formatFechaStr(cuo.fecha)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-slate-500 font-mono text-center">
                        {formatCurrency(cuo.capital)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-slate-500 font-mono text-center">
                        {formatCurrency(cuo.interes)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-black text-slate-700 font-mono text-center">
                        {formatCurrency(cuo.total)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-slate-500 font-mono text-center">
                        {formatCurrency(cuo.saldo)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                          isPagada ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isPagada ? '✓ LIQUIDADO' : 'PENDIENTE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </>
  );

  if (isEmbedded) {
    return TableContent;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
      <div className="bg-white border border-slate-100/80 rounded-2xl p-6 shadow-sm flex-1 flex flex-col min-h-[400px]">
        {TableContent}
      </div>
    </div>
  );
};
