/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { CheckCircle2, Camera, FileUp, Clock, MapPin } from 'lucide-react';
import { User, Task } from '../types';

export default function GestionDashboard({ user, socket }: { user: User, socket: Socket }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidence, setEvidence] = useState<string>('');

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidence(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchTasks();
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

  const handleCompleteTask = async (taskId: number) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      setSelectedTask(null);
      setEvidence('');
      fetchTasks();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Operaciones</h3>
        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
          <Clock size={16} />
          {tasks.length} Tareas Activas
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Tareas por Completar</h4>
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
                    {task.client_location}
                  </div>
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
                        <FileUp size={14} /> Ver Adjunto
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-current/10">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Asignado: {JSON.parse(task.assigned_to).join(', ')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {new Date(task.scheduled_time).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
              No hay tareas pendientes de gestión.
            </div>
          )}
        </div>

        {/* Completion Form */}
        <div className="sticky top-24">
          {selectedTask ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                  <CheckCircle2 className="text-white" size={24} />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Finalizar Tarea</h4>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Anexar Evidencia</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleEvidenceFileChange}
                      className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  {evidence && (
                    <div className="relative w-32 h-32 mt-2 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      {evidence.startsWith('data:image') ? (
                        <img src={evidence} alt="Evidencia" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FileUp size={24} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3">
                <Clock className="text-orange-500 shrink-0" size={20} />
                <p className="text-xs text-orange-800 leading-relaxed">
                  Al marcar como completada, se notificará al administrador y se cerrará el flujo de trabajo para esta tarea específica.
                </p>
              </div>

              <button 
                onClick={() => handleCompleteTask(selectedTask.id)}
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
              >
                Marcar como Completada
              </button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-medium">
              Selecciona una tarea para ver detalles y completarla
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
