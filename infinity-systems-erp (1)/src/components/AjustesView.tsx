import React, { useState, useRef } from 'react';
import { User, Camera, Save, Phone, Lock, User as UserIcon } from 'lucide-react';
import { User as UserType } from '../types';

export default function AjustesView({ user, setUser }: { user: UserType, setUser: (u: UserType) => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [password, setPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(user.profile_picture || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          password: password || undefined,
          profile_picture: profilePicture
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMessage({ text: 'Perfil actualizado exitosamente', type: 'success' });
        setPassword(''); // clear password field
      } else {
        setMessage({ text: 'Error al actualizar el perfil', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error de red', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-lg">Perfil de Usuario</h3>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-8">
          {message.text && (
            <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center relative">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">{name.charAt(0)}</span>
                )}
                <div 
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="text-white" size={24} />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">Haz clic en la imagen para cambiarla</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <UserIcon size={14} /> Nombre Completo
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <Phone size={14} /> Teléfono
              </label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. 555 123 4567"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <Lock size={14} /> Nueva Contraseña
              </label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiar"
              />
              <p className="text-xs text-gray-400 mt-2">Solo escribe una contraseña si deseas cambiar la actual.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
