import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Client, User } from '../types';

export default function ClientesView({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClient, setNewClient] = useState({
    unique_id: '',
    name: '',
    location: '',
    branch: '',
    full_address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        setIsClientModalOpen(false);
        setNewClient({ unique_id: '', name: '', location: '', branch: '', full_address: '' });
        await fetchClients();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Directorio de Clientes</h3>
        <button 
          onClick={() => setIsClientModalOpen(true)}
          className="bg-white text-gray-900 px-4 md:px-6 py-3 rounded-xl font-bold border border-gray-200 flex items-center justify-center gap-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all text-sm md:text-base"
        >
          <Plus size={20} />
          Registrar Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h4 className="font-bold text-gray-900">Clientes Registrados</h4>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total: {clients.length}</span>
        </div>
        <div className="divide-y divide-gray-200">
          {clients.map(client => (
            <div key={client.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{client.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{client.branch}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full ml-auto md:ml-2">ID: {client.unique_id}</span>
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Sede:</span> {client.location}
                </p>
                {client.full_address && (
                  <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                    <span className="mt-0.5">📍</span> {client.full_address}
                  </p>
                )}
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No hay clientes registrados actualmente.
            </div>
          )}
        </div>
      </div>

      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Registrar Nuevo Cliente</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">ID Único de Cliente</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newClient.unique_id}
                  onChange={e => setNewClient({ ...newClient, unique_id: e.target.value })}
                  placeholder="Auto-generado si se deja en blanco"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Nombre de la Empresa</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Ubicación (Dirección)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newClient.location}
                  onChange={e => setNewClient({ ...newClient, location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Sucursal</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500"
                  value={newClient.branch}
                  onChange={e => setNewClient({ ...newClient, branch: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Domicilio Completo (Google Maps)</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                  value={newClient.full_address}
                  onChange={e => setNewClient({ ...newClient, full_address: e.target.value })}
                  placeholder="Calle, Número, Colonia, CP, Ciudad..."
                  required
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
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
                  {isSubmitting ? 'Registrando...' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
