import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, LayoutDashboard, Search, Filter, Loader2 } from 'lucide-react';
import { OnboardingModal } from '../../components/saas/OnboardingModal';
import { TenantModal360 } from '../../components/saas/TenantModal360';
import api from '../../services/api';

export interface TenantListDTO {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  representanteLegal: string;
  correoInstitucional: string;
  estado: string;
  limiteUsuariosAdmin: number;
  limiteSocios: number;
  totalUsuarios: number;
  totalSocios: number;
  createdAt: string;
}

export const SaasDashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Error fetching tenants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [isModalOpen]);



  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.ruc?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || t.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculatePercentage = (current: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    const percentage = (current / limit) * 100;
    return Math.min(percentage, 100);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Dashboard Maestro
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Gestión centralizada de cooperativas y tenants.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#0054A6] hover:bg-[#004080] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#0054A6]/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Cooperativa
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cooperativas</p>
            <p className="text-2xl font-black text-slate-800">3</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activas</p>
            <p className="text-2xl font-black text-slate-800">2</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuarios Totales</p>
            <p className="text-2xl font-black text-slate-800">{tenants.reduce((acc, t) => acc + (t.totalUsuarios || 0), 0)}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Cooperativas Registradas</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por RUC o Razón Social..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6] cursor-pointer"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="SUSPENDIDO">Suspendido</option>
                <option value="PERIODO_PRUEBA">Período de Prueba</option>
                <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Cooperativa</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Creación</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Cuota Uso Admin</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Cuota Socios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Cargando tenants...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No se encontraron cooperativas registradas.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedTenantId(t.id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{t.razonSocial}</p>
                          <p className="text-xs text-slate-500 font-medium">RUC: {t.ruc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-center">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                        t.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        t.estado === 'SUSPENDIDO' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-center font-bold text-slate-800 text-xs">
                          {t.totalUsuarios} <span className="text-slate-400 font-normal">/ {t.limiteUsuariosAdmin || '∞'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${calculatePercentage(t.totalUsuarios, t.limiteUsuariosAdmin) >= 90 ? 'bg-rose-500' : 'bg-[#0054A6]'}`} 
                            style={{ width: `${calculatePercentage(t.totalUsuarios, t.limiteUsuariosAdmin)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-center font-bold text-slate-800 text-xs">
                          {t.totalSocios} <span className="text-slate-400 font-normal">/ {t.limiteSocios || '∞'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${calculatePercentage(t.totalSocios, t.limiteSocios) >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${calculatePercentage(t.totalSocios, t.limiteSocios)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal */}
      {isModalOpen && (
        <OnboardingModal onClose={() => setIsModalOpen(false)} />
      )}

      {/* Tenant 360 Modal */}
      {selectedTenantId && (
        <TenantModal360 
          tenantId={selectedTenantId} 
          onClose={() => setSelectedTenantId(null)} 
          onUpdate={fetchTenants} 
        />
      )}


    </div>
  );
};
