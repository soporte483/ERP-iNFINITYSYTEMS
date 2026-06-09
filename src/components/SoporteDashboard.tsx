/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import SignatureCanvas, { SignatureCanvasRef } from './SignatureCanvas';
import { Map, FileText, Plus, ClipboardList, Camera, CheckCircle2, AlertCircle, Clock, MapPin } from 'lucide-react';
import { User, Ticket, Client, Task } from '../types';

export default function SoporteDashboard({ user, socket }: { user: User, socket: Socket }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newDocument, setNewDocument] = useState({ title: '', type: 'plano', location: '', file_url: '' });
  const [selectedDocument, setSelectedDocument] = useState<{id?: number, title: string, type: 'plano' | 'volumetria', date?: string, location?: string, status?: string, file_url?: string} | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const sigPad = useRef<SignatureCanvasRef>(null);
  const [reportData, setReportData] = useState({
    client_id: '',
    type: 'mantenimiento_correctivo',
    description: '',
    evidence_url: '',
    signature_url: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchClients();
    fetchTasks();
    fetchDocuments();
    socket.on('ticket:created', (ticket: Ticket) => setTickets(prev => prev.some(t => t.id === ticket.id) ? prev : [ticket, ...prev]));
    socket.on('ticket:updated', ({ id, status }: { id: number, status: string }) => {
      setTickets(prev => prev.map(t => t.id === Number(id) ? { ...t, status } : t));
      if (selectedTicket && selectedTicket.id === Number(id)) {
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
    });
    socket.on('task:created', (task: Task) => {
      try {
        const assignedUsers = JSON.parse(task.assigned_to) as string[];
        if (assignedUsers.includes(user.name) && task.status !== 'completed') {
          setTasks(prev => prev.some(t => t.id === task.id) ? prev : [task, ...prev]);
        }
      } catch (e) {
        console.error("Error parsing assigned_to", e);
      }
    });
    socket.on('task:updated', ({ id, status }: { id: string, status: string }) => {
      setTasks(prev => prev.map(t => t.id === Number(id) ? { ...t, status: status as any } : t));
    });
    socket.on('document:created', (doc: any) => setDocuments(prev => [doc, ...prev]));
    socket.on('document:updated', ({ id, status }: { id: number, status: string }) => {
      setDocuments(prev => prev.map(d => d.id === Number(id) ? { ...d, status } : d));
      if (selectedDocument && selectedDocument.id === Number(id)) {
        setSelectedDocument(prev => prev ? { ...prev, status } : null);
      }
    });
    return () => {
      socket.off('ticket:created');
      socket.off('ticket:updated');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('document:created');
      socket.off('document:updated');
    };
  }, [socket]);

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data);
  };

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data.filter((t: Task) => {
      const isCompleted = t.status === 'completed';
      const assignedUsers = JSON.parse(t.assigned_to) as string[];
      const isAssigned = assignedUsers.includes(user.name);
      return !isCompleted && isAssigned;
    }));
  };

  const fetchTickets = async () => {
    const res = await fetch('/api/tickets');
    const data = await res.json();
    setTickets(data);
  };

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportData(prev => ({ ...prev, evidence_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDocument(prev => ({ ...prev, file_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReport) return;
    
    let finalSignature = reportData.signature_url;
    if (sigPad.current && !sigPad.current.isEmpty()) {
      finalSignature = sigPad.current.getCanvas().toDataURL('image/png');
    }

    if (!finalSignature) {
      alert('La firma es obligatoria para el reporte de ingeniería');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportData,
          signature_url: finalSignature,
          task_id: selectedTask?.id
        }),
      });
      if (res.ok) {
        setIsReportModalOpen(false);
        setReportData({ client_id: '', type: 'mantenimiento_correctivo', description: '', evidence_url: '', signature_url: '' });
        setSelectedTask(null);
        fetchTasks();
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDocument),
    });
    if (res.ok) {
      setIsUploadModalOpen(false);
      setNewDocument({ title: '', type: 'plano', location: '', file_url: '' });
      fetchDocuments();
    }
  };

  const handleUpdateDocumentStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/documents/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchDocuments();
    }
  };

  const handleResolveTicket = async (id: number) => {
    const res = await fetch(`/api/tickets/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    if (res.ok) {
      setIsTicketModalOpen(false);
      setSelectedTicket(null);
      fetchTickets();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Ingeniería y Soporte</h3>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Plus size={20} />
            Subir Documento
          </button>
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md shadow-orange-500/20"
          >
            <Plus size={20} />
            Generar Reporte de Ingeniería
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engineering Tasks & Assigned Tasks */}
        <div className="lg:col-span-2 space-y-8">
          {/* Assigned Tasks (New) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Mis Tareas de Ingeniería</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-6 bg-white rounded-3xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-orange-200 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-gray-900">{task.client_name}</h5>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        {task.client_branch}
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">
                      {task.status}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.problem}</p>
                  
                  {(task.contact_phone || task.attachment_url) && (
                    <div className="flex flex-col gap-2 mb-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                      {task.contact_phone && (
                        <div className="flex items-center gap-2 text-xs text-orange-800 font-medium">
                          <span className="font-bold uppercase tracking-wider opacity-70">Teléfono:</span> {task.contact_phone}
                        </div>
                      )}
                      {task.attachment_url && (
                        <div className="flex items-center gap-2 text-xs text-orange-800 font-medium">
                          <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                            <FileText size={14} /> Ver Adjunto
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {new Date(task.scheduled_time).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedTask(task);
                        setReportData({ ...reportData, client_id: task.client_id.toString() });
                        setIsReportModalOpen(true);
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider text-orange-600 hover:underline"
                    >
                      Generar Reporte
                    </button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-sm">
                  No tienes tareas de ingeniería asignadas.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Map size={20} className="text-orange-500" />
              Planos y Ubicaciones Pendientes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.filter(d => d.type === 'plano').map(doc => (
                <EngineeringCard 
                  key={doc.id}
                  title={doc.title} 
                  location={doc.location || 'Sin ubicación'} 
                  status={doc.status}
                  onClick={() => {
                    setSelectedDocument({ id: doc.id, title: doc.title, type: 'plano', location: doc.location, status: doc.status, file_url: doc.file_url });
                    setIsDocumentModalOpen(true);
                  }}
                />
              ))}
              {documents.filter(d => d.type === 'plano').length === 0 && (
                <div className="col-span-2 p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 text-sm">
                  No hay planos pendientes.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ClipboardList size={20} className="text-yellow-500" />
              Volumetrías y Presupuestos
            </h4>
            <div className="space-y-3">
              {documents.filter(d => d.type === 'volumetria').map(doc => (
                <VolumetryItem 
                  key={doc.id}
                  name={doc.title} 
                  date={new Date(doc.created_at).toLocaleDateString()} 
                  onClick={() => {
                    setSelectedDocument({ id: doc.id, title: doc.title, type: 'volumetria', date: new Date(doc.created_at).toLocaleDateString(), status: doc.status, file_url: doc.file_url });
                    setIsDocumentModalOpen(true);
                  }}
                />
              ))}
              {documents.filter(d => d.type === 'volumetria').length === 0 && (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 text-sm">
                  No hay volumetrías pendientes.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Support Tickets from Technicians */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-500" />
              Tickets de Técnicos
            </h4>
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div key={ticket.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900">{ticket.client_name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Abierto</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ticket.problem}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {new Date(ticket.created_at).toLocaleTimeString()}
                    </span>
                    <button 
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsTicketModalOpen(true);
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider text-orange-600 hover:underline"
                    >
                      Atender Ticket
                    </button>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs font-medium">
                  No hay tickets de soporte activos.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Generar Reporte de Ingeniería</h3>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={reportData.client_id}
                  onChange={e => setReportData({ ...reportData, client_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.unique_id ? `[${c.unique_id}] ` : ''}{c.name} - {c.branch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo de Servicio</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={reportData.type}
                  onChange={e => setReportData({ ...reportData, type: e.target.value as any })}
                  required
                >
                  <option value="mantenimiento_correctivo">Mantenimiento Correctivo</option>
                  <option value="mantenimiento_preventivo">Mantenimiento Preventivo</option>
                  <option value="instalacion">Instalación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Descripción del Trabajo</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  value={reportData.description}
                  onChange={e => setReportData({ ...reportData, description: e.target.value })}
                  placeholder="Detalle los trabajos realizados..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Evidencia (Foto de galería o cámara)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleEvidenceFileChange}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  {reportData.evidence_url && (
                    <div className="relative w-32 h-32 mt-2 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <img src={reportData.evidence_url} alt="Evidencia" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Firma de Conformidad (Ingeniería)</label>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <SignatureCanvas 
                    ref={sigPad}
                    penColor='black'
                    canvasProps={{
                      className: 'w-full h-40 cursor-crosshair'
                    }}
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => sigPad.current?.clear()}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-orange-600 transition-colors"
                >
                  Limpiar Firma
                </button>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Guardando...' : 'Guardar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Modal */}
      {isDocumentModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{selectedDocument.title}</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedDocument.status === 'Aprobado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {selectedDocument.status}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-center min-h-[300px] border border-gray-200">
              {selectedDocument.file_url ? (
                <div className="text-center">
                  <a href={selectedDocument.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 transition-all shadow-sm">
                    <FileText size={20} className="text-orange-500" />
                    Abrir Documento
                  </a>
                  <p className="text-xs text-gray-400 mt-4">
                    {selectedDocument.type === 'plano' ? `Ubicación: ${selectedDocument.location}` : `Fecha: ${selectedDocument.date}`}
                  </p>
                </div>
              ) : selectedDocument.type === 'plano' ? (
                <div className="text-center text-gray-400">
                  <Map size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Vista previa del plano no disponible</p>
                  <p className="text-xs mt-1">Ubicación: {selectedDocument.location}</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Documento de volumetría</p>
                  <p className="text-xs mt-1">Fecha: {selectedDocument.date}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsDocumentModalOpen(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  if (selectedDocument?.id) {
                    handleUpdateDocumentStatus(selectedDocument.id, selectedDocument.status === 'Pendiente' ? 'En Revisión' : selectedDocument.status === 'En Revisión' ? 'Aprobado' : 'Pendiente');
                  }
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <ClipboardList size={18} />
                Actualizar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Subir Documento</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Título</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newDocument.title}
                  onChange={e => setNewDocument({ ...newDocument, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo de Documento</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newDocument.type}
                  onChange={e => setNewDocument({ ...newDocument, type: e.target.value as 'plano' | 'volumetria' })}
                  required
                >
                  <option value="plano">Plano</option>
                  <option value="volumetria">Volumetría</option>
                </select>
              </div>
              {newDocument.type === 'plano' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ubicación</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={newDocument.location}
                    onChange={e => setNewDocument({ ...newDocument, location: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Archivo de la computadora o celular</label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    onChange={handleDocumentFileChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  {newDocument.file_url && newDocument.file_url.startsWith('data:image/') && (
                    <div className="relative w-32 h-32 mt-2 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <img src={newDocument.file_url} alt="Vista previa" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {newDocument.file_url && !newDocument.file_url.startsWith('data:image/') && (
                    <div className="text-xs text-green-600 font-medium">Archivo seleccionado correctamente</div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20"
                >
                  Subir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Ticket de Soporte</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {selectedTicket.status === 'resolved' ? 'Resuelto' : 'Abierto'}
              </span>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Cliente</p>
                <p className="text-sm font-medium text-gray-900">{selectedTicket.client_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Ubicación</p>
                <p className="text-sm font-medium text-gray-900">{selectedTicket.location}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Problema</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200">{selectedTicket.problem}</p>
              </div>
              {selectedTicket.evidence_url && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Evidencia</p>
                  <a href={selectedTicket.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
                    <Camera size={16} className="text-orange-500" />
                    Ver Evidencia
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cerrar
              </button>
              {selectedTicket.status !== 'resolved' && (
                <button 
                  onClick={() => handleResolveTicket(selectedTicket.id)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Marcar como Resuelto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EngineeringCard({ title, location, status, onClick }: { title: string, location: string, status: string, onClick?: () => void }) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">{title}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{status}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <Map size={10} />
        {location}
      </div>
      <button 
        onClick={onClick}
        className="w-full bg-white text-gray-900 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all mt-2"
      >
        Ver Detalles
      </button>
    </div>
  );
}

function VolumetryItem({ name, date, onClick }: { name: string, date: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
          <FileText size={16} className="text-yellow-600" />
        </div>
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
    </div>
  );
}

