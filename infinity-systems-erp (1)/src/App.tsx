/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Wrench,
  ShieldCheck,
  Camera,
  MessageSquare,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, User, Task, Client, Ticket } from './types';

// Components (to be implemented in separate files or below)
import AdminDashboard from './components/AdminDashboard';
import GestionDashboard from './components/GestionDashboard';
import SoporteDashboard from './components/SoporteDashboard';
import TecnicoDashboard from './components/TecnicoDashboard';
import AjustesView from './components/AjustesView';
import TareasView from './components/TareasView';
import ReportesView from './components/ReportesView';
import UsuariosView from './components/UsuariosView';
import ClientesView from './components/ClientesView';

const socket: Socket = io();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        alert('Credenciales inválidas');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/logo.png" 
              alt="Infinity Systems Logo" 
              className="h-16 object-contain mb-6"
            />
            <p className="text-black/50 text-sm">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1 ml-1">Usuario</label>
              <input 
                type="text" 
                value={loginData.username}
                onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="admin, gestion, soporte, tecnico"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black/40 mb-1 ml-1">Contraseña</label>
              <input 
                type="password" 
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#f5f5f5] border-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 mt-4 shadow-md shadow-orange-500/20"
            >
              {loading ? 'Cargando...' : 'Entrar al Sistema'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-black/5 text-center">
            <p className="text-[10px] text-black/30 uppercase tracking-[0.2em] font-mono">
              Infinity Systems &copy; 2026
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            {user.role === 'admin' && <AdminDashboard user={user} socket={socket} />}
            {user.role === 'gestion' && <GestionDashboard user={user} socket={socket} />}
            {user.role === 'soporte' && <SoporteDashboard user={user} socket={socket} />}
            {user.role === 'tecnico' && <TecnicoDashboard user={user} socket={socket} />}
          </>
        );
      case 'tareas':
        return <TareasView user={user} />;
      case 'reportes':
        return <ReportesView user={user} />;
      case 'clientes':
        return <ClientesView user={user} />;
      case 'usuarios':
        return <UsuariosView />;
      case 'ajustes':
        return <AjustesView user={user} setUser={setUser} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col lg:flex-row font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-black/5 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Infinity Systems Logo" 
            className="h-6 object-contain"
          />
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black"
        >
          <LayoutDashboard size={24} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white flex flex-col border-r border-black/5 z-50 transition-transform duration-300 transform shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        <div className="p-6">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/logo.png" 
              alt="Infinity Systems Logo" 
              className="h-10 object-contain"
            />
          </div>

          
          <nav className="space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<ClipboardList size={20} />} 
              label="Tareas" 
              active={activeView === 'tareas'} 
              onClick={() => { setActiveView('tareas'); setIsSidebarOpen(false); }}
            />
              <NavItem 
                icon={<FileText size={20} />} 
                label="Reportes" 
                active={activeView === 'reportes'} 
                onClick={() => { setActiveView('reportes'); setIsSidebarOpen(false); }}
              />
              {user.role === 'admin' && (
                <>
                  <NavItem 
                    icon={<Users size={20} />} 
                    label="Clientes" 
                    active={activeView === 'clientes'} 
                    onClick={() => { setActiveView('clientes'); setIsSidebarOpen(false); }}
                  />
                  <NavItem 
                    icon={<ShieldCheck size={20} />} 
                    label="Usuarios" 
                    active={activeView === 'usuarios'} 
                    onClick={() => { setActiveView('usuarios'); setIsSidebarOpen(false); }}
                  />
                </>
              )}
              <NavItem 
                icon={<Settings size={20} />} 
                label="Ajustes" 
                active={activeView === 'ajustes'}
                onClick={() => { setActiveView('ajustes'); setIsSidebarOpen(false); }}
              />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold overflow-hidden">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium w-full"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <header className="bg-white border-b border-black/5 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-black tracking-tight">
              {activeView === 'dashboard' ? (
                <>
                  {user.role === 'admin' && 'Panel de Administración'}
                  {user.role === 'gestion' && 'Gestión de Operaciones'}
                  {user.role === 'soporte' && 'Ingeniería y Soporte'}
                  {user.role === 'tecnico' && 'Servicio Técnico'}
                </>
              ) : (
                activeView.charAt(0).toUpperCase() + activeView.slice(1)
              )}
            </h2>
            <p className="text-black/40 text-[10px] md:text-xs font-medium">Bienvenido de nuevo, {user.name}</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-[#f5f5f5] rounded-full text-sm border-none focus:ring-1 focus:ring-black w-full"
              />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
        ${active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
