/**
 * CHECKPOINT: Infinity Systems ERP - Version 1.5 (Responsive & Task Optimization)
 */
import React, { useState, useEffect } from "react";
import { Shield, ShieldAlert, Settings, Wrench } from "lucide-react";
import { User, Role } from "../types";

const roleOrder: Role[] = ["admin", "gestion", "soporte", "tecnico"];

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  gestion: "Gestión",
  soporte: "Soporte",
  tecnico: "Técnico",
};

const roleStyles: Record<Role, string> = {
  admin: "bg-red-100 text-red-700",
  gestion: "bg-purple-100 text-purple-700",
  soporte: "bg-blue-100 text-blue-700",
  tecnico: "bg-green-100 text-green-700",
};

const roleIcons: Record<Role, JSX.Element> = {
  admin: <ShieldAlert size={12} />,
  gestion: <Shield size={12} />,
  soporte: <Settings size={12} />,
  tecnico: <Wrench size={12} />,
};

export default function UsuariosView() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Error al cargar usuarios");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la lista de usuarios");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditData({ name: user.name || "", password: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setEditData({ name: "", password: "" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    setError(null);

    try {
      const payload: { name: string; password?: string } = {
        name: editData.name.trim(),
      };
      if (editData.password.trim().length > 0) {
        payload.password = editData.password.trim();
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Error al actualizar usuario");
      }

      await fetchUsers();
      closeModal();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(user.id);
    setError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Error al eliminar usuario");
      }

      await fetchUsers();
      if (selectedUser?.id === user.id) {
        closeModal();
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "No se pudo eliminar el usuario");
    } finally {
      setDeletingId(null);
    }
  };

  const usersByRole = roleOrder.reduce((acc, role) => {
    acc[role] = users.filter((user) => user.role === role);
    return acc;
  }, {} as Record<Role, User[]>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-gray-500">Administración por rol.</p>
      </div>

      {loading && (
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Cargando usuarios...</div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {roleOrder.map((role) => (
        <section key={role} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{roleLabels[role]}</h2>
              <p className="text-sm text-gray-500">
                {usersByRole[role].length} usuario{usersByRole[role].length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {usersByRole[role].length === 0 ? (
            <p className="text-sm text-gray-500">No hay usuarios en esta categoría.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usersByRole[role].map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4">{user.id}</td>
                      <td className="px-4 py-4">{user.username}</td>
                      <td className="px-4 py-4">{user.name}</td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Ajustes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Editar usuario</h2>
                <p className="text-sm text-gray-500">Actualiza el nombre y la contraseña del usuario.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Contraseña</label>
                <input
                  type="password"
                  value={editData.password}
                  onChange={(e) => setEditData((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="Dejar vacío para mantener la contraseña actual"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Si no deseas cambiar la contraseña, deja el campo vacío.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
