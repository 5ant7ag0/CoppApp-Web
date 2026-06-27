import React, { useState, useEffect } from 'react';
import { Send, Users, Search, Wallet, User, CheckCircle2, ArrowRight, AlertCircle, Info, Mail, FileText, Loader2, Download, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';

interface Account {
  id: number;
  numeroCuenta: string;
  tipo: string;
  saldo: number;
  estado: string;
}

interface DestinationDetails {
  id: number;
  numeroCuenta: string;
  nombresCompletos: string;
  tipo: string;
}

interface Contact {
  name: string;
  accountNo: string;
  email: string;
  type: string;
  avatarColor: string;
  textColor: string;
}

const FREQUENT_CONTACTS: Contact[] = [
  {
    name: 'Carlos Perez',
    accountNo: '401012000001',
    email: 'cperez@gmail.com.com',
    type: 'Transferencia Interna',
    avatarColor: 'bg-blue-50',
    textColor: 'text-[#0054A6]',
  },
  {
    name: 'Juan Pueblo Ortega',
    accountNo: '0201000001',
    email: 'juan.pueblo@hotmail.com',
    type: 'Transferencia Interna',
    avatarColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    name: 'María Belén Espinosa',
    accountNo: '401010000002',
    email: 'mbelen@espinosa.com',
    type: 'Transferencia Interna',
    avatarColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  }
];

export const Transferencias: React.FC = () => {
  const { user } = useAuth();
  const { activeTenant } = useTenant();

  // Accounts states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  
  // Contacts list state loaded from localStorage (defaulting to initial list)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const local = localStorage.getItem('coop_contacts');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return FREQUENT_CONTACTS;
      }
    }
    // Initialize localStorage with defaults
    localStorage.setItem('coop_contacts', JSON.stringify(FREQUENT_CONTACTS));
    return FREQUENT_CONTACTS;
  });

  const handleSaveContact = (name: string, accountNo: string) => {
    if (contacts.some(c => c.accountNo === accountNo)) return;
    
    // Choose a color theme for the avatar
    const colors = [
      { avatar: 'bg-blue-50', text: 'text-[#0054A6]' },
      { avatar: 'bg-emerald-50', text: 'text-emerald-600' },
      { avatar: 'bg-purple-50', text: 'text-purple-600' },
      { avatar: 'bg-indigo-50', text: 'text-indigo-600' },
      { avatar: 'bg-pink-50', text: 'text-pink-600' }
    ];
    const color = colors[contacts.length % colors.length];

    const newContact: Contact = {
      name: name,
      accountNo: accountNo,
      email: '',
      type: 'Transferencia Interna',
      avatarColor: color.avatar,
      textColor: color.text
    };
    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('coop_contacts', JSON.stringify(updated));
  };
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'interna' | 'otros'>('interna');
  
  // Destination account states
  const [destinationNo, setDestinationNo] = useState('');
  const [debouncedDestinationNo, setDebouncedDestinationNo] = useState('');
  const [destinationAccount, setDestinationAccount] = useState<DestinationDetails | null>(null);
  const [valStatus, setValStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [valError, setValError] = useState('');
  
  // Form fields
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [correo, setCorreo] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [successData, setSuccessData] = useState<{
    monto: number;
    concepto: string;
    cuentaOrigen: string;
    cuentaDestino: string;
    beneficiario: string;
    referencia: string;
    fecha: string;
  } | null>(null);
  
  // Contacts search state
  const [contactSearch, setContactSearch] = useState('');
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Fetch user accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/cuentas/mis-cuentas');
        const activeAccounts = res.data.filter((acc: Account) => acc.estado === 'ACTIVA');
        setAccounts(activeAccounts);
        if (activeAccounts.length > 0) {
          setSelectedAccountId(activeAccounts[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching accounts:', err);
        setPageError('No se pudieron cargar tus cuentas de ahorro. Intenta más tarde.');
      }
    };
    fetchAccounts();
  }, []);

  // 2. Debounce account number input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDestinationNo(destinationNo);
    }, 500);
    return () => clearTimeout(handler);
  }, [destinationNo]);

  // 3. Dynamic background validation
  useEffect(() => {
    const validateDest = async () => {
      if (debouncedDestinationNo.length < 8) {
        setValStatus('idle');
        setDestinationAccount(null);
        setValError('');
        return;
      }

      setValStatus('validating');
      setValError('');
      try {
        const res = await api.get(`/cuentas/buscar-destinatario?numeroCuenta=${debouncedDestinationNo}`);
        setDestinationAccount(res.data);
        setValStatus('success');
      } catch (err: any) {
        setDestinationAccount(null);
        setValStatus('error');
        setValError(err.response?.data || 'Cuenta de destino inválida o no encontrada.');
      }
    };

    if (activeTab === 'interna') {
      validateDest();
    } else {
      setValStatus('idle');
      setDestinationAccount(null);
      setValError('');
    }
  }, [debouncedDestinationNo, activeTab]);

  // Handle contact selection from agenda
  const handleSelectContact = (accountNo: string) => {
    setActiveTab('interna');
    setDestinationNo(accountNo);
    setDebouncedDestinationNo(accountNo); // Validate immediately
    setPageError('');
  };

  // Find currently selected account details
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const availableBalance = selectedAccount?.saldo || 0;
  
  // Real-time funds verification
  const isInsufficientFunds = parseFloat(monto) > availableBalance;

  // Numeric and Decimal filter for money input
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setMonto(val);
      setPageError('');
    }
  };

  // Strict digit-only filter for account input
  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*$/.test(val)) {
      setDestinationNo(val);
      setPageError('');
    }
  };

  // Submit transfer (opens confirmation modal)
  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit validations on submit
    if (!selectedAccount) {
      setPageError('Por favor, selecciona una cuenta de origen.');
      return;
    }
    if (activeTab !== 'interna') {
      setPageError('Las transferencias interbancarias (Otros Bancos) no están disponibles en este momento.');
      return;
    }
    if (!destinationNo) {
      setPageError('Por favor, ingresa el número de cuenta de destino.');
      return;
    }
    if (valStatus !== 'success' || !destinationAccount) {
      setPageError('Por favor, ingresa una cuenta de destino válida y espera a que sea confirmada.');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      setPageError('Por favor, ingresa un monto válido mayor a cero.');
      return;
    }
    if (isInsufficientFunds) {
      setPageError('Saldo disponible insuficiente en la cuenta de origen.');
      return;
    }
    if (!concepto.trim()) {
      setPageError('Por favor, ingresa el concepto o motivo de la transferencia.');
      return;
    }

    setPageError('');
    setShowConfirmModal(true);
  };

  // Actual execution of transfer
  const executeTransfer = async () => {
    if (!selectedAccount || !destinationAccount) return;

    setLoading(true);
    setPageError('');
    setShowConfirmModal(false);
    
    try {
      await api.post('/cuentas/transferir', {
        cuentaOrigenId: selectedAccount.id,
        cuentaDestinoId: destinationAccount.id,
        monto: parseFloat(monto),
        concepto: concepto
      });

      // Update source account balance locally to avoid full refetch
      const updatedBalance = availableBalance - parseFloat(monto);
      setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? { ...acc, saldo: updatedBalance } : acc));

      // Set success data for receipt display
      setSuccessData({
        monto: parseFloat(monto),
        concepto: concepto,
        cuentaOrigen: selectedAccount.numeroCuenta,
        cuentaDestino: destinationAccount.numeroCuenta,
        beneficiario: destinationAccount.nombresCompletos,
        referencia: 'TRF-' + Math.floor(100000 + Math.random() * 900000),
        fecha: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      // Reset form
      setDestinationNo('');
      setDebouncedDestinationNo('');
      setDestinationAccount(null);
      setValStatus('idle');
      setMonto('');
      setConcepto('');
      setCorreo('');
    } catch (err: any) {
      console.error('Error executing transfer:', err);
      setPageError(err.response?.data || 'Ocurrió un error inesperado al procesar la transferencia.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceiptPdf = () => {
    if (!successData) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    // Background and Styling
    doc.setFillColor(255, 255, 255);
    doc.rect(5, 5, 138, 200, 'F');
    
    // Header accent line (emerald)
    doc.setFillColor(16, 185, 129);
    doc.rect(5, 5, 138, 3, 'F');

    // Cooperative Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(activeTenant?.name?.toUpperCase() || "COOPERATIVA DE AHORRO Y CRÉDITO ITQ", 74, 22, { align: "center" });

    // Receipt Header Title
    doc.setFontSize(15);
    doc.setTextColor(26, 26, 26);
    doc.text("¡Transferencia exitosa!", 74, 32, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 174, 192);
    doc.text("Comprobante de transacción electrónica", 74, 38, { align: "center" });

    // Decorative Circle Checkmark (Emerald)
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.ellipse(74, 55, 9, 9, 'F');
    
    // Draw Checkmark
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(1.2);
    doc.line(71, 55, 73.2, 57.2);
    doc.line(73.2, 57.2, 77.5, 52.5);

    // Amount
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Monto Transferido", 74, 76, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 84, 166);
    doc.text(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(successData.monto), 74, 86, { align: "center" });

    // Divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, 96, 133, 96);
    doc.setLineDashPattern([], 0);

    // Details fields
    const drawRow = (label: string, value: string, y: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 15, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(26, 26, 26);
      const splitValue = doc.splitTextToSize(value, 60);
      doc.text(splitValue, 133, y, { align: "right" });
    };

    let currentY = 106;
    drawRow("Remitente", user?.nombresCompletos || '', currentY);
    currentY += 10;
    drawRow("Cuenta de Origen", successData.cuentaOrigen, currentY);
    currentY += 10;
    drawRow("Beneficiario", successData.beneficiario, currentY);
    currentY += 10;
    drawRow("Cuenta de Destino", successData.cuentaDestino, currentY);
    currentY += 10;
    drawRow("Concepto", successData.concepto, currentY);
    currentY += 10;
    drawRow("Número de Referencia", successData.referencia, currentY);
    currentY += 10;
    drawRow("Fecha y Hora", successData.fecha, currentY);

    // Save the PDF
    doc.save(`comprobante_${successData.referencia}.pdf`);
  };

  // Initials generator
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Success view (Receipt)
  if (successData) {
    return (
      <div className="max-w-md mx-auto animate-fade-in pt-4 select-none">
        <Card className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-[0_20px_50px_rgba(0,84,166,0.06)] overflow-hidden relative">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
          
          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {activeTenant?.name || 'Cooperativa de Ahorro y Crédito ITQ'}
            </span>
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm animate-scale-up">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">¡Transferencia exitosa!</h2>
              <p className="text-slate-400 text-xs mt-1">Comprobante de transacción electrónica</p>
            </div>
          </div>

          <div className="mt-8 space-y-5 border-t border-b border-dashed border-slate-100 py-6">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Monto Transferido</span>
              <span className="text-2xl font-black text-[#0054A6]">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(successData.monto)}
              </span>
            </div>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Beneficiario</span>
                <span className="font-semibold text-slate-700">{successData.beneficiario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cuenta de Destino</span>
                <span className="font-semibold text-slate-700">{successData.cuentaDestino}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cuenta de Origen</span>
                <span className="font-semibold text-slate-700">{successData.cuentaOrigen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Concepto</span>
                <span className="font-semibold text-slate-700">{successData.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Número de Referencia</span>
                <span className="font-mono font-bold text-slate-600">{successData.referencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y Hora</span>
                <span className="font-semibold text-slate-700">{successData.fecha}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {!contacts.some(c => c.accountNo === successData.cuentaDestino) && (
              <Button
                onClick={() => handleSaveContact(successData.beneficiario, successData.cuentaDestino)}
                variant="outline"
                className="w-full border border-slate-200 text-[#0054A6] hover:bg-slate-50 font-semibold rounded-2xl h-11 text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                + Guardar en Mis Contactos
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => setSuccessData(null)}
                className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                Realizar Otra Transferencia
              </Button>
              <Button
                onClick={handleDownloadReceiptPdf}
                variant="outline"
                title="Descargar comprobante"
                className="w-12 h-12 border border-slate-200 hover:bg-slate-50 font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center text-slate-600 shrink-0"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in select-none">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Transferir Fondos</h1>
        <p className="text-slate-500 text-sm mt-1">Realiza transferencias inmediatas y gestiona tus movimientos financieros.</p>
      </div>

      {pageError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <span>{pageError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* LEFT COLUMN: Transfer Form (col-span 3) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)]">
            <form onSubmit={handleTransfer} className="space-y-6">
              
              {/* 1. SOURCE ACCOUNT SELECTOR */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuenta de Origen</label>
                
                <div className="relative">
                  {/* Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0054A6] focus:bg-white text-sm font-semibold transition-all flex items-center justify-between cursor-pointer"
                  >
                    {selectedAccount ? (
                      <div className="flex justify-between items-center w-full pr-6">
                        <span className="text-sm text-slate-700 font-bold">
                          {selectedAccount.tipo === 'AHORRO_VISTA' ? 'Ahorro a la Vista' : selectedAccount.tipo} - {selectedAccount.numeroCuenta}
                        </span>
                        <span className="text-sm font-black text-emerald-600">
                          ${selectedAccount.saldo.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Cargando cuentas...</span>
                    )}
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Dropdown Options List */}
                  {isSelectOpen && accounts.length > 0 && (
                    <>
                      {/* Click outside overlay */}
                      <div className="fixed inset-0 z-10" onClick={() => setIsSelectOpen(false)} />
                      
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto animate-scale-up">
                        {accounts.map(acc => (
                          <div
                            key={acc.id}
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              setIsSelectOpen(false);
                              setPageError('');
                            }}
                            className={`px-4 py-3.5 hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-all border-b border-slate-50 last:border-0 ${
                              selectedAccountId === acc.id ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            <span className="text-sm text-slate-700 font-bold">
                              {acc.tipo === 'AHORRO_VISTA' ? 'Ahorro a la Vista' : acc.tipo} - {acc.numeroCuenta}
                            </span>
                            <span className="text-sm font-black text-emerald-600">
                              ${acc.saldo.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. TRANSACTION TYPE PILLS */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Transferencia</label>
                 <div className="grid grid-cols-2 p-1 bg-[#F1F3F6] border border-slate-100/50 rounded-full gap-1">
                   <button
                     type="button"
                     onClick={() => {
                       setActiveTab('interna');
                       setPageError('');
                     }}
                     className="relative py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer text-slate-500 hover:text-slate-805"
                   >
                     {activeTab === 'interna' && (
                       <motion.div
                         layoutId="activeTabTransferencia"
                         className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                         transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                       />
                     )}
                     <span className={`relative z-10 transition-colors duration-300 ${
                       activeTab === 'interna' ? 'text-white' : 'text-slate-500'
                     }`}>
                       Transferencia Interna
                     </span>
                   </button>
                   <button
                     type="button"
                     onClick={() => {
                       setActiveTab('otros');
                       setPageError('');
                     }}
                     className="relative py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-805"
                   >
                     {activeTab === 'otros' && (
                       <motion.div
                         layoutId="activeTabTransferencia"
                         className="absolute inset-0 bg-[#0054A6] rounded-full shadow-[0_4px_12px_rgba(0,84,166,0.15)]"
                         transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                       />
                     )}
                     <span className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                       activeTab === 'otros' ? 'text-white' : 'text-slate-500'
                     }`}>
                       Otros Bancos
                       <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide transition-colors duration-300 ${
                         activeTab === 'otros' ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-500'
                       }`}>
                         Próximamente
                       </span>
                     </span>
                   </button>
                 </div>
              </div>

              {/* 3. DESTINATION ACCOUNT */}
              {activeTab === 'interna' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Cuenta Destino</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={destinationNo}
                      onChange={handleDestinationChange}
                      placeholder="Ej. 401012000001"
                      className={`w-full bg-slate-50/40 border rounded-xl pl-4 pr-10 py-3 text-sm font-semibold transition-all focus:outline-none focus:bg-white ${
                        valStatus === 'error'
                          ? 'border-red-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500'
                          : valStatus === 'success'
                          ? 'border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                          : 'border-slate-200/60 focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6]'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                      {valStatus === 'validating' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#0054A6]" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  {/* Background Val Status */}
                  {valStatus === 'success' && destinationAccount && (
                    <div className="flex items-center justify-between animate-fade-in mt-1.5">
                      <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        Titular: {destinationAccount.nombresCompletos}
                      </p>
                      {!contacts.some(c => c.accountNo === destinationAccount.numeroCuenta) && (
                        <button
                          type="button"
                          onClick={() => handleSaveContact(destinationAccount.nombresCompletos, destinationAccount.numeroCuenta)}
                          className="text-[10px] text-[#0054A6] hover:text-[#004080] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          + Guardar Contacto
                        </button>
                      )}
                    </div>
                  )}
                  {valStatus === 'error' && valError && (
                    <p className="text-xs text-red-500 font-semibold flex items-center gap-1 animate-fade-in">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                      {valError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-800">
                    <p className="font-bold">Interconexión Interbancaria Inactiva</p>
                    <p className="leading-relaxed opacity-90">
                      El módulo de transferencias hacia otros bancos (SPI) se encuentra en fase de homologación del canal del Banco Central de la República. Por favor, utiliza únicamente Transferencia Interna.
                    </p>
                  </div>
                </div>
              )}

              {/* 4. AMOUNT */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto a Transferir</label>
                  {selectedAccount && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Disponible: ${selectedAccount.saldo.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={monto}
                    onChange={handleMontoChange}
                    placeholder="0.00"
                    disabled={activeTab !== 'interna'}
                    className={`w-full bg-slate-50/40 border rounded-xl py-4 text-center text-3xl font-black text-slate-800 focus:outline-none focus:bg-white transition-all tracking-tight ${
                      isInsufficientFunds
                        ? 'border-red-200 text-red-600 focus:ring-4 focus:ring-red-500/10 focus:border-red-500'
                        : 'border-slate-200/60 focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6]'
                    }`}
                  />
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 text-xl font-bold">
                    $
                  </div>
                </div>
                {isInsufficientFunds && (
                  <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 animate-fade-in justify-center">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Saldo disponible insuficiente.</span>
                  </p>
                )}
              </div>

              {/* 5. CONCEPT & EMAIL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concepto / Motivo</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={concepto}
                      onChange={(e) => {
                        setConcepto(e.target.value);
                        setPageError('');
                      }}
                      placeholder="Ej. Pago de Alquiler"
                      disabled={activeTab !== 'interna'}
                      className="w-full bg-slate-50/40 border border-slate-200/60 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] focus:bg-white transition-all text-slate-700"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Notificación <span className="text-[10px] text-slate-400 lowercase">(opcional)</span></label>
                  <div className="relative">
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="destinatario@correo.com"
                      disabled={activeTab !== 'interna'}
                      className="w-full bg-slate-50/40 border border-slate-200/60 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] focus:bg-white transition-all text-slate-700"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={loading || activeTab !== 'interna'}
                className="w-full bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-12 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-[#0054A6] disabled:text-white disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Procesando Transferencia...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-white" />
                    <span>Enviar Transferencia</span>
                  </>
                )}
              </Button>

            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: Contacts Agenda (col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_15px_40px_-10px_rgba(0,84,166,0.03)] h-full min-h-[400px] flex flex-col">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0054A6] shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Contactos</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 pt-4 flex-1 flex flex-col">
              {/* Search bar */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full bg-slate-50/40 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-[#0054A6]/10 focus:border-[#0054A6] focus:bg-white transition-all text-slate-700"
                />
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Contacts list */}
              <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No se encontraron beneficiarios
                  </div>
                ) : (
                  filteredContacts.map((contact, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectContact(contact.accountNo)}
                      className="w-full p-3 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/70 transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Circular Avatar */}
                        <div className={`h-10 w-10 rounded-full ${contact.avatarColor} ${contact.textColor} font-bold text-xs flex items-center justify-center shrink-0`}>
                          {getInitials(contact.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-700 truncate group-hover:text-[#0054A6] transition-all">
                            {contact.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Cta: {contact.accountNo}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 group-hover:hidden">
                          Interna
                        </span>
                        <span className="text-[9px] font-bold text-[#0054A6] bg-blue-50 px-2 py-1 rounded-md border border-blue-100 hidden group-hover:inline-block animate-fade-in whitespace-nowrap">
                          Transferir a este contacto
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:translate-x-0.5 group-hover:text-[#0054A6] transition-all" />
                      </div>
                    </button>
                  ))
                )}
              </div>


            </CardContent>
          </Card>
        </div>

      {/* Modal de Confirmación de Transferencia */}
      {showConfirmModal && selectedAccount && destinationAccount && (
        <div 
          onClick={() => setShowConfirmModal(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200/50 rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 md:p-8 animate-scale-up select-none relative overflow-hidden"
          >
            {/* Top decoration strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#0054A6]" />
            
            {/* Close button */}
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {activeTenant?.name || 'Cooperativa de Ahorro y Crédito ITQ'}
              </span>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0054A6] shadow-sm">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Confirmar Transferencia</h2>
                <p className="text-slate-400 text-xs mt-1">Por favor verifica los datos antes de continuar</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2.5">
                <span className="text-slate-400">Monto</span>
                <span className="font-extrabold text-sm text-[#0054A6]">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(monto))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Beneficiario</span>
                <span className="font-semibold text-slate-700 text-right">{destinationAccount.nombresCompletos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cuenta de Destino</span>
                <span className="font-semibold text-slate-700">{destinationAccount.numeroCuenta}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cuenta de Origen</span>
                <span className="font-semibold text-slate-700">{selectedAccount.numeroCuenta}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Concepto</span>
                <span className="font-semibold text-slate-700 text-right">{concepto}</span>
              </div>
              {correo.trim() && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Notificación</span>
                  <span className="font-semibold text-slate-700 text-right truncate max-w-[180px]">{correo}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold rounded-2xl h-11 text-xs transition-all cursor-pointer flex items-center justify-center"
              >
                Cancelar
              </Button>
              <Button
                onClick={executeTransfer}
                disabled={loading}
                className="flex-1 bg-[#0054A6] hover:bg-[#004080] text-white font-semibold rounded-2xl h-11 transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-white" />
                    Confirmar y Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Transferencias;
