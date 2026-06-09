/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Clock, Users, MapPin } from 'lucide-react';
import { Task, User } from '../types';

export default function TareasView({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    if (user.role === 'admin') {
      setTasks(data);
    } else {
      setTasks(data.filter((t: Task) => {
        try {
          const assignedUsers = JSON.parse(t.assigned_to) as string[];
          return assignedUsers.includes(user.name);
        } catch {
          return false;
        }
      }));
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = t.client_name.toLowerCase().includes(search.toLowerCase()) || 
                         t.problem.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-2xl font-bold text-black tracking-tight">Listado Maestro de Tareas</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o problema..." 
              className="pl-10 pr-4 py-2 bg-white rounded-xl text-sm border border-black/5 focus:ring-1 focus:ring-black w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white rounded-xl text-sm border border-black/5 focus:ring-1 focus:ring-black"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En Proceso</option>
            <option value="completed">Completadas</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-black/[0.02] border-b border-black/5">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Cliente / Sucursal</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Problemática</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Tipo</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Asignado</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Programación</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-black/[0.01] transition-colors">
                <td className="p-4">
                  <div className="font-bold text-sm text-black">{task.client_name}</div>
                  <div className="text-[10px] text-black/40 font-medium">{task.client_branch}</div>
                  {task.client_address && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.client_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] mt-1 text-blue-600 hover:underline"
                    >
                      <MapPin size={10} />
                      Ver Mapa
                    </a>
                  )}
                </td>
                <td className="p-4">
                  <p className="text-xs text-black/60 line-clamp-2 max-w-xs">{task.problem}</p>
                </td>
                <td className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-black/5 rounded text-black/60">
                    {task.type}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/40">
                    <Users size={12} />
                    {JSON.parse(task.assigned_to).join(', ')}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/40">
                    <Clock size={12} />
                    {new Date(task.scheduled_time).toLocaleString()}
                  </div>
                </td>
                <td className="p-4">
                  <StatusBadge status={task.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        {filteredTasks.length === 0 && (
          <div className="p-12 text-center text-black/30">
            No se encontraron tareas con los filtros aplicados.
          </div>
        )}
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
