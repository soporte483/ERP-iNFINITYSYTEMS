/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import SignatureCanvas, { SignatureCanvasRef } from './SignatureCanvas';
import { 
  ClipboardList, 
  Plus, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  PenTool,
  Package,
  MapPin,
  Clock
} from 'lucide-react';
import { User, Task, Client, ReportItem } from '../types';

export default function TecnicoDashboard({ user, socket }: { user: User, socket: Socket }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sigPad = useRef<SignatureCanvasRef>(null);

  // Form States
  const [reportData, setReportData] = useState({
    type: 'instalacion',
    client_name: '',
    client_address: '',
    service_date: new Date().toISOString().split('T')[0],
    description: '',
    evidence_url: '',
    signature_url: '',
    items: [] as ReportItem[]
  });

  const [ticketData, setTicketData] = useState({
    client_name: '',
    location: '',
    problem: '',
    evidence_url: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchClients();
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
    return () => {
      socket.off('task:created');
      socket.off('task:updated');
    };
  }, [socket]);

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

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };

  const handleAddItem = () => {
    setReportData({
      ...reportData,
      items: [...reportData.items, { model: '', serial: '', name: '', type: '', quantity: 1 }]
    });
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

  const handleUpdateItem = (index: number, field: keyof ReportItem, value: any) => {
    const newItems = [...reportData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setReportData({ ...reportData, items: newItems });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || isSubmitting) return;

    let finalSignature = reportData.signature_url;
    if (sigPad.current && !sigPad.current.isEmpty()) {
      // Use getCanvas() instead of getTrimmedCanvas() to avoid issues with trim-canvas dependency
      finalSignature = sigPad.current.getCanvas().toDataURL('image/png');
    }

    if (!finalSignature) {
      alert('La firma del cliente es obligatoria');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportData,
          signature_url: finalSignature,
          task_id: selectedTask.id,
          client_id: selectedTask.client_id
        }),
      });

      if (res.ok) {
        setIsReportModalOpen(false);
        setSelectedTask(null);
        fetchTasks();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ticketData, tecnico_id: user.id }),
    });
    if (res.ok) {
      setIsTicketModalOpen(false);
      setTicketData({ client_name: '', location: '', problem: '', evidence_url: '' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Servicio Técnico</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setIsTicketModalOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md shadow-orange-500/20"
          >
            <AlertTriangle size={18} />
            Solicitar Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Mis Tareas Asignadas</h4>
          {tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => setSelectedTask(task)}
              className={`
                p-6 rounded-2xl border transition-all cursor-pointer
                ${selectedTask?.id === task.id ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-transparent shadow-md shadow-orange-500/20' : 'bg-white border-gray-200 hover:border-orange-200'}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h5 className="font-bold text-lg">{task.client_name}</h5>
                  <div className="flex items-center gap-1 text-xs opacity-60">
                    <MapPin size={12} />
                    {task.client_branch}
                  </div>
                  {task.client_address && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.client_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-center gap-1 text-[10px] mt-1 hover:underline ${selectedTask?.id === task.id ? 'text-white' : 'text-blue-600'}`}
                    >
                      <MapPin size={10} />
                      Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${selectedTask?.id === task.id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                  {task.status}
                </div>
              </div>
              <p className={`text-sm mb-4 ${selectedTask?.id === task.id ? 'text-white/90' : 'text-gray-500'}`}>
                {task.problem}
              </p>

              {(task.contact_phone || task.attachment_url) && (
                <div className={`flex flex-col gap-2 mb-4 p-3 rounded-xl border ${selectedTask?.id === task.id ? 'bg-white/10 border-white/20' : 'bg-orange-50 border-orange-100'}`}>
                  {task.contact_phone && (
                    <div className={`flex items-center gap-2 text-xs font-medium ${selectedTask?.id === task.id ? 'text-white' : 'text-orange-800'}`}>
                      <span className="font-bold uppercase tracking-wider opacity-70">Teléfono:</span> {task.contact_phone}
                    </div>
                  )}
                  {task.attachment_url && (
                    <div className={`flex items-center gap-2 text-xs font-medium ${selectedTask?.id === task.id ? 'text-white' : 'text-orange-800'}`}>
                      <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                        <Package size={14} /> Ver Adjunto
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-current/10">
                <div className="flex items-center gap-2 opacity-60">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {new Date(task.scheduled_time).toLocaleString()}
                  </span>
                </div>
                {selectedTask?.id === task.id && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setReportData({
                        ...reportData,
                        client_name: task.client_name || '',
                        client_address: task.location || '',
                        service_date: new Date().toISOString().split('T')[0],
                      });
                      setIsReportModalOpen(true); 
                    }}
                    className="bg-white text-orange-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-all"
                  >
                    Llenar Reporte
                  </button>
                )}
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
              No tienes tareas asignadas.
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
          <h4 className="font-bold text-gray-900 mb-6">Instrucciones de Campo</h4>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardList className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Reporte Obligatorio</p>
                <p className="text-xs text-gray-500 leading-relaxed">Todos los servicios deben concluir con un reporte firmado por el cliente para validar la entrega.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Soporte en Sitio</p>
                <p className="text-xs text-gray-500 leading-relaxed">Si encuentras una problemática técnica que no puedes resolver, solicita un ticket de soporte de inmediato.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200 my-8">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Reporte de Servicio: {selectedTask.client_name}</h3>
            <form onSubmit={handleSubmitReport} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre del Cliente</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={reportData.client_name}
                    onChange={e => setReportData({ ...reportData, client_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Fecha</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={reportData.service_date}
                    onChange={e => setReportData({ ...reportData, service_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Dirección del Cliente</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={reportData.client_address}
                  onChange={e => setReportData({ ...reportData, client_address: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo de Servicio</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={reportData.type}
                    onChange={e => setReportData({ ...reportData, type: e.target.value as any })}
                    required
                  >
                    <option value="instalacion">Instalación</option>
                    <option value="mantenimiento_correctivo">Mantenimiento Correctivo</option>
                    <option value="mantenimiento_preventivo">Mantenimiento Preventivo</option>
                  </select>
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
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Trabajos Realizados</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  value={reportData.description}
                  onChange={e => setReportData({ ...reportData, description: e.target.value })}
                  placeholder="Detalle los trabajos realizados..."
                  required
                />
              </div>

              {reportData.type === 'instalacion' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Equipos Instalados</label>
                    <button 
                      type="button"
                      onClick={handleAddItem}
                      className="text-[10px] font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Agregar Equipo
                    </button>
                  </div>
                  <div className="space-y-3">
                    {reportData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-xl relative group">
                        <div className="sm:col-span-2 md:col-span-1">
                          <label className="block text-[8px] font-bold uppercase text-gray-400 mb-1 md:hidden">Nombre</label>
                          <input 
                            placeholder="Nombre"
                            className="w-full px-3 py-2 rounded-lg bg-white border-none text-xs focus:ring-2 focus:ring-orange-500"
                            value={item.name}
                            onChange={e => handleUpdateItem(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase text-gray-400 mb-1 md:hidden">Modelo</label>
                          <input 
                            placeholder="Modelo"
                            className="w-full px-3 py-2 rounded-lg bg-white border-none text-xs focus:ring-2 focus:ring-orange-500"
                            value={item.model}
                            onChange={e => handleUpdateItem(index, 'model', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase text-gray-400 mb-1 md:hidden">Serie</label>
                          <input 
                            placeholder="Serie"
                            className="w-full px-3 py-2 rounded-lg bg-white border-none text-xs focus:ring-2 focus:ring-orange-500"
                            value={item.serial}
                            onChange={e => handleUpdateItem(index, 'serial', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase text-gray-400 mb-1 md:hidden">Cant</label>
                          <input 
                            type="number"
                            placeholder="Cant"
                            className="w-full px-3 py-2 rounded-lg bg-white border-none text-xs focus:ring-2 focus:ring-orange-500"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(index, 'quantity', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Firma del Cliente (Dibuje abajo)</label>
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
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando...' : 'Finalizar y Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Solicitar Ticket de Soporte</h3>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre del Cliente</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={ticketData.client_name}
                  onChange={e => setTicketData({ ...ticketData, client_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ubicación</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={ticketData.location}
                  onChange={e => setTicketData({ ...ticketData, location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Problemática</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  value={ticketData.problem}
                  onChange={e => setTicketData({ ...ticketData, problem: e.target.value })}
                  placeholder="Describa el problema técnico..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Captura de Pantalla / Foto (URL)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={ticketData.evidence_url}
                    onChange={e => setTicketData({ ...ticketData, evidence_url: e.target.value })}
                  />
                  <button type="button" className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <Camera size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20"
                >
                  Enviar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
