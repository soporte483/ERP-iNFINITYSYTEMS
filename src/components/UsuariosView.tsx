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
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Ajustes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
