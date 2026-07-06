import React from 'react';
import { getAssetUrl } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/card';
import { 
  TrendingUp, 
  Ban, 
  AlertCircle, 
  AlertTriangle 
} from 'lucide-react';

interface Socio {
  id?: number;
  identificacion?: string;
  nombresCompletos?: string;
  actividadEconomica?: string;
  fotoPerfilUrl?: string;
  ingresosMensuales?: number;
  gastosMensuales?: number;
  deudasActuales?: number;
}

interface PerfilCrediticioSocioProps {
  socio: Socio;
  cuotaProyectada: number;
  estadoCredito?: string;
  motivoRechazo?: string;
  layout?: 'stack' | 'grid';
}



const getCreditScore = (socio: Socio, cuota: number) => {
  const ing = socio.ingresosMensuales ?? 0;
  const gas = socio.gastosMensuales ?? 0;
  const deu = socio.deudasActuales ?? 0;
  const netFlow = Number(ing) - Number(gas);
  
  let score = 700;
  
  if (netFlow > 0) {
    score += Math.min(150, Math.floor(netFlow / 10));
  } else {
    score -= 150;
  }
  
  if (deu > 0) {
    score -= Math.min(150, Math.floor(deu / 5));
  }
  
  const ratio = netFlow > 0 ? (cuota / netFlow) * 100 : 100;
  if (ratio > 40) {
    score -= 200;
  } else if (netFlow <= 0) {
    score -= 250;
  } else {
    score += 50;
  }
  
  return Math.max(300, Math.min(1000, score));
};

export const PerfilCrediticioSocio: React.FC<PerfilCrediticioSocioProps> = ({ 
  socio, 
  cuotaProyectada, 
  estadoCredito, 
  motivoRechazo,
  layout = 'stack'
}) => {
  const ingresos = socio.ingresosMensuales ?? 0;
  const gastos = socio.gastosMensuales ?? 0;
  const deudas = socio.deudasActuales ?? 0;
  const flujoNeto = Number(ingresos) - Number(gastos);
  const porcentajeCapacidad = flujoNeto > 0 ? (cuotaProyectada / flujoNeto) * 100 : 100;
  const superaCapacidad = flujoNeto <= 0 || porcentajeCapacidad > 40;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Primera fila: Perfil y Score */}
      <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start" : "space-y-4"}>
        <div className="space-y-2.5">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
            Perfil del Socio Solicitante
          </h4>
          
          {/* Datos Básicos */}
          <Card className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 shadow-none flex items-center gap-4 h-full min-h-[140px]">
            {/* Foto de Perfil */}
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
              {socio?.fotoPerfilUrl ? (
                <img 
                  src={getAssetUrl(socio.fotoPerfilUrl)} 
                  alt="Perfil" 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <span className="text-2xl font-black text-slate-400">
                  {socio?.nombresCompletos?.charAt(0) || 'S'}
                </span>
              )}
            </div>
            {/* Datos */}
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-slate-450 font-medium">Socio:</span>
                <span className="font-extrabold text-slate-700 uppercase">{socio?.nombresCompletos}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-slate-450 font-medium">Cédula:</span>
                <span className="font-bold text-slate-700 font-mono">{socio?.identificacion}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                <span className="text-slate-450 font-medium">Actividad:</span>
                <span className="font-semibold text-slate-700">{(socio?.actividadEconomica || 'No declarada').replace(/_/g, ' ')}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-2.5">
          <h4 className={`text-xs font-extrabold text-slate-400 uppercase tracking-widest text-transparent select-none ${layout === 'grid' ? 'hidden md:block' : 'hidden'}`}>
            Score
          </h4>
          {/* Score Crediticio (Media Dona Gauge SVG) */}
          <Card className={`rounded-3xl border border-slate-100 p-4 shadow-sm bg-white space-y-1 ${layout === 'grid' ? 'h-full min-h-[140px] flex flex-col justify-center' : ''}`}>
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              Score de Buró Crediticio
            </h5>
            <div className="relative flex flex-col items-center">
              {(() => {
                const scoreVal = getCreditScore(socio, cuotaProyectada);
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
        </div>
      </div>

      {/* Segunda fila: Ingresos y Alertas */}
      <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start" : "space-y-4"}>
        {/* Ingresos y Gastos */}
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
        </div>

        {/* Alertas y Rechazos */}
        <div className="space-y-4">
          <h4 className={`text-xs font-extrabold text-slate-400 uppercase tracking-widest text-transparent select-none ${layout === 'grid' ? 'hidden md:block' : 'hidden'}`}>
            Alertas
          </h4>
          
          {/* Banner de Advertencia del 40% */}
          {superaCapacidad && cuotaProyectada > 0 && (
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

          {/* Motivo de rechazo previo */}
          {estadoCredito === 'RECHAZADO' && motivoRechazo && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                Historial de Resolución
              </h4>
              <div className="p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl">
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-1">Motivo de Rechazo:</span>
                <p className="text-xs text-rose-700 font-bold leading-relaxed">{motivoRechazo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
