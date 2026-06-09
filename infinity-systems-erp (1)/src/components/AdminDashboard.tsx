/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { Plus, Users, Clock, AlertCircle, CheckCircle2, MessageSquare, Phone, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Task, Client, Role } from '../types';

export default function AdminDashboard({ user, socket }: { user: User, socket: Socket }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    client_id: '',
    problem: '',
    type: 'tecnico' as Role,
    sub_type: 'soporte_remoto',
    assigned_to: [] as string[],
    scheduled_time: '',
    contact_phone: '',
    attachment_url: '',
    location: '',
    companion: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchClients();
    fetchUsers();

    socket.on('task:created', (task: Task) => {
      setTasks(prev => prev.some(t => t.id === task.id) ? prev : [task, ...prev]);
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
    setTasks(data);
  };

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTask(prev => ({ ...prev, attachment_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Si es soporte presencial y hay un acompañante, lo agregamos a los asignados
    let finalAssignedTo = [...newTask.assigned_to];
    if (newTask.type === 'soporte' && newTask.sub_type === 'soporte_presencial' && newTask.companion) {
      if (!finalAssignedTo.includes(newTask.companion)) {
        finalAssignedTo.push(newTask.companion);
      }
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, assigned_to: finalAssignedTo }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewTask({ client_id: '', problem: '', type: 'tecnico', sub_type: 'soporte_remoto', assigned_to: [], scheduled_time: '', contact_phone: '', attachment_url: '', location: '', companion: '' });
        await fetchTasks();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectContact = async () => {
    try {
      if ('contacts' in navigator && (navigator as any).contacts) {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts.length > 0) {
          const contact = contacts[0];
          const phone = contact.tel && contact.tel.length > 0 ? contact.tel[0] : '';
          const name = contact.name && contact.name.length > 0 ? contact.name[0].trim() : '';
          
          let formattedPhoneString = phone;
          if (name && phone) {
            formattedPhoneString = `${name} (${phone})`;
          } else if (name) {
            formattedPhoneString = name;
          }
          
          setNewTask(prev => ({ ...prev, contact_phone: formattedPhoneString }));
        }
      } else {
        alert("La aplicación de contactos no es compatible con este navegador o dispositivo. Por favor ingresa el número manualmente.");
      }
    } catch (err) {
      console.error("Error seleccionando contacto:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Resumen de Actividad</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-4 md:px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm md:text-base shadow-md shadow-orange-500/20"
          >
            <Plus size={20} />
            Asignar Nueva Tarea
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Clock className="text-orange-500" />} 
          label="Pendientes" 
          value={tasks.filter(t => t.status === 'pending').length.toString()} 
        />
        <StatCard 
          icon={<AlertCircle className="text-blue-500" />} 
          label="En Proceso" 
          value={tasks.filter(t => t.status === 'in_progress').length.toString()} 
        />
        <StatCard 
          icon={<CheckCircle2 className="text-green-500" />} 
          label="Completadas" 
          value={tasks.filter(t => t.status === 'completed').length.toString()} 
        />
      </div>

      {/* Workload Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="text-orange-500" size={24} />
          <h4 className="font-bold text-gray-900">Carga de Trabajo por Departamento</h4>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { id: 'tecnico', name: 'Área Técnica' },
                { id: 'soporte', name: 'Ingeniería' },
                { id: 'gestion', name: 'Administración' }
              ].map(dept => {
                const deptTasks = tasks.filter(t => t.type === dept.id);
                return {
                  name: dept.name,
                  Pendientes: deptTasks.filter(t => t.status === 'pending').length,
                  'En Proceso': deptTasks.filter(t => t.status === 'in_progress').length,
                  Completadas: deptTasks.filter(t => t.status === 'completed').length,
                  Total: deptTasks.length
                };
              })}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Pendientes" stackId="a" fill="#FFEDD5" stroke="#F97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="En Proceso" stackId="a" fill="#DBEAFE" stroke="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Completadas" stackId="a" fill="#DCFCE7" stroke="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h4 className="font-bold text-gray-900">Tareas Recientes</h4>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Actualizado en tiempo real</span>
        </div>
        <div className="divide-y divide-gray-200">
          {tasks.map(task => (
            <div key={task.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{task.client_name}</span>
                  {task.client_unique_id && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">ID: {task.client_unique_id}</span>
                  )}
                  <span className="text-xs text-gray-400">• {task.client_branch}</span>
                </div>
                <p className="text-sm text-gray-500">{task.problem}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <Users size={12} />
                    {JSON.parse(task.assigned_to).join(', ')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <Clock size={12} />
                    {new Date(task.scheduled_time).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={task.status} />
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MessageSquare size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No hay tareas asignadas actualmente.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Asignar Nueva Tarea</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newTask.client_id}
                  onChange={e => setNewTask({ ...newTask, client_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.unique_id ? `[${c.unique_id}] ` : ''}{c.name} - {c.branch}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Problemática</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  value={newTask.problem}
                  onChange={e => setNewTask({ ...newTask, problem: e.target.value })}
                  placeholder="Describa el problema o requerimiento..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Tipo de Tarea</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newTask.type}
                  onChange={e => setNewTask({ ...newTask, type: e.target.value as Role })}
                  required
                >
                  <option value="tecnico">Técnico</option>
                  <option value="soporte">Soporte / Ingeniería</option>
                  <option value="gestion">Gestión</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Asignar Personal (Seleccione uno o varios)</label>
                <div className="grid grid-cols-1 gap-2 p-4 bg-gray-50 rounded-xl max-h-60 overflow-y-auto border border-gray-200">
                  <div className="space-y-2">
                    <h5 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mt-2">{newTask.type}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {users.filter(u => u.role === newTask.type || (newTask.type === 'soporte' && u.role === 'soporte')).map(u => (
                        <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${newTask.assigned_to.includes(u.name) ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-transparent' : 'bg-white border-gray-200 hover:border-orange-200'}`}>
                          <input 
                            type="checkbox"
                            checked={newTask.assigned_to.includes(u.name)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, assigned_to: [...newTask.assigned_to, u.name] });
                              } else {
                                setNewTask({ ...newTask, assigned_to: newTask.assigned_to.filter(name => name !== u.name) });
                              }
                            }}
                            className="hidden"
                          />
                          <span className="text-xs font-medium truncate">{u.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {newTask.type === 'soporte' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Modo de Operación</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={newTask.sub_type}
                    onChange={e => setNewTask({ ...newTask, sub_type: e.target.value })}
                  >
                    <option value="soporte_remoto">Soporte Remoto</option>
                    <option value="ingenieria_instalacion">Ingeniería de Instalación</option>
                    <option value="soporte_presencial">Soporte Presencial</option>
                  </select>
                </div>
              )}

              {(newTask.type !== 'soporte' || newTask.sub_type === 'soporte_presencial') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Fecha y Hora de Cita</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={newTask.scheduled_time}
                    onChange={e => setNewTask({ ...newTask, scheduled_time: e.target.value })}
                    required
                  />
                </div>
              )}

              {newTask.type === 'soporte' && newTask.sub_type === 'soporte_remoto' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Contacto Telefónico</label>
                  <div className="flex gap-2">
                    <input 
                      type="tel" 
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                      value={newTask.contact_phone}
                      onChange={e => setNewTask({ ...newTask, contact_phone: e.target.value })}
                      placeholder="Número de contacto (opcional)"
                    />
                    {'contacts' in navigator && (
                      <button
                        type="button"
                        onClick={handleSelectContact}
                        className="bg-orange-100 text-orange-600 px-4 rounded-xl hover:bg-orange-200 transition-colors flex items-center justify-center font-bold text-sm h-12 whitespace-nowrap"
                        title="Elegir desde libreta de contactos"
                      >
                        <Phone size={18} className="mr-2" />
                        Contactos
                      </button>
                    )}
                  </div>
                </div>
              )}

              {newTask.type === 'soporte' && newTask.sub_type === 'ingenieria_instalacion' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ubicación de la Instalación</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                      value={newTask.location}
                      onChange={e => setNewTask({ ...newTask, location: e.target.value })}
                      placeholder="Dirección o ubicación específica"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Archivos Adjuntos (Planos, Fotos, PDF)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                    </div>
                    {newTask.attachment_url && (
                      <p className="text-xs text-green-600 mt-2">Archivo listo para subir</p>
                    )}
                  </div>
                </>
              )}

              {newTask.type === 'soporte' && newTask.sub_type === 'soporte_presencial' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Técnico Acompañante</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                    value={newTask.companion}
                    onChange={e => setNewTask({ ...newTask, companion: e.target.value })}
                  >
                    <option value="">Ir Solo</option>
                    {users.filter(u => u.role === 'tecnico' || u.role === 'soporte').map(u => (
                      <option key={u.id} value={u.name}>{u.name} - {u.role}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };
  const labels = {
    pending: 'Pendiente',
    in_progress: 'En Proceso',
    completed: 'Completado'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}
