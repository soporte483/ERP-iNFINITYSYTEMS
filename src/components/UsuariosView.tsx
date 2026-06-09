/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, Wrench, Settings, Trash2 } from 'lucide-react';
import { User, Role } from '../types';

export default function UsuariosView() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'tecnico' as Role
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setIsModalOpen(false);
      setNewUser({ username: '', password: '', name: '', role: 'tecnico' });
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error || 'Error al crear usuario');
    }
  };

  const getDepartment = (role: Role) => {
    switch(role) {
      case 'admin':
      case 'gestion':
        return 'Administración';
      case 'tecnico':
        return 'Área Técnica';
      case 'soporte':
        return 'Ingeniería';
      default:
        return 'Otros';
    }
  };

  const departments = ['Administración', 'Ingeniería', 'Área Técnica'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-2xl font-bold text-black tracking-tight">Gestión de Personal</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
        >
          <UserPlus size={20} />
          Registrar Nuevo Usuario
        </button>
      </div>

      <div className="space-y-12">
        {departments.map(dept => {
          const deptUsers = users.filter(u => getDepartment(u.role) === dept);
          if (deptUsers.length === 0) return null;
          return (
            <div key={dept} className="space-y-4">
              <h4 className="text-xl font-bold text-gray-800 border-b pb-2">{dept}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deptUsers.map(u => (
                  <div key={u.id} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-black/[0.03] flex items-center justify-center font-bold text-lg">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-black">{u.name}</h4>
                          <p className="text-xs text-black/40">@{u.username}</p>
                        </div>
                      </div>
                      <RoleBadge role={u.role} />
                    </div>
                    
                    <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">ID: #{u.id.toString().padStart(3, '0')}</span>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/40 hover:text-black">
                          <Settings size={16} />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-black/10">
            <h3 className="text-xl font-bold mb-6">Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-black"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1">Nombre de Usuario</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-black"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="jperez"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1">Contraseña</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-black"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1">Rol en la Empresa</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-black"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })}
                  required
                >
                  <optgroup label="Área Técnica">
                    <option value="tecnico">Técnico</option>
                  </optgroup>
                  <optgroup label="Ingeniería">
                    <option value="soporte">Ingeniero / Soporte</option>
                  </optgroup>
                  <optgroup label="Administración">
                    <option value="gestion">Gestión</option>
                    <option value="admin">Administrador</option>
                  </optgroup>
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-black/80 transition-all"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const icons = {
    admin: <ShieldAlert size={12} />,
    gestion: <Shield size={12} />,
    soporte: <Settings size={12} />,
    tecnico: <Wrench size={12} />
  };
  const styles = {
    admin: 'bg-red-100 text-red-700',
    gestion: 'bg-purple-100 text-purple-700',
    soporte: 'bg-blue-100 text-blue-700',
    tecnico: 'bg-green-100 text-green-700'
  };
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${styles[role]}`}>
      {icons[role]}
      {role}
    </span>
  );
}
