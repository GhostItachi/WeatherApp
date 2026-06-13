import { useState, useEffect } from "react";
import apiClient from "../api/client";
// UserManagement component for the admin dashboard.

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>("user");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (err: unknown) {
      console.error("Error al recuperar el padrón de usuarios:", err);
      setError(
        "Fallo en la comunicación con la base de datos de persistencia.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadUsersOnMount = async () => {
      try {
        const response = await apiClient.get("/users");
        setUsers(response.data);
      } catch (err: unknown) {
        console.error("Error al recuperar el padrón de usuarios:", err);
        setError(
          "Fallo en la comunicación con la base de datos de persistencia.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadUsersOnMount();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("user");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      if (editingUser) {
        const payload: { email: string; role: string; password?: string } = {
          email,
          role,
        };
        if (password) payload.password = password;

        await apiClient.put(`/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post("/users", { email, password, role });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      console.error("Fallo en la operación de guardado:", err);
      setError("No se pudo procesar la transacción del usuario.");
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await apiClient.patch(`/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      fetchUsers();
    } catch (err: unknown) {
      console.error("Error al modificar estado de cuenta:", err);
      const maybeErr = err as { response?: { data?: { detail?: string } } };
      const detail =
        maybeErr.response?.data?.detail ||
        "No se pudo alterar el estado de suspensión.";
      setError(`Error: ${detail}`);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (
      !window.confirm(
        "¿Confirma la remoción permanente de este registro de usuario?",
      )
    )
      return;
    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: unknown) {
      console.error("Error en la eliminación lógica/física:", err);
      setError(
        "Restricción de integridad referencial: No se pudo eliminar el usuario.",
      );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-200 uppercase">
            Administración Central de Cuentas
          </h3>
          <p className="text-slate-500 text-xs font-mono">
            Control de accesos, roles y políticas de suspensión del ecosistema
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white text-xs font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
        >
          [CREAR NUEVO USUARIO]
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono rounded-lg">
          ERROR: {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 italic text-xs font-mono text-center py-8">
          [Consultando registros relacionales...]
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Identificador</th>
                <th className="py-3 px-4 font-semibold">Correo Electrónico</th>
                <th className="py-3 px-4 font-semibold">Rol Asignado</th>
                <th className="py-3 px-4 font-semibold">Estado Cuenta</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-950/40 text-slate-300">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-slate-600 italic"
                  >
                    [No existen registros de usuarios en la base de datos
                    activa]
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500">#{user.id}</td>
                    <td className="py-3 px-4 font-bold">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          user.role === "admin"
                            ? "bg-purple-950/40 border border-purple-500/30 text-purple-400"
                            : "bg-slate-950 border border-slate-800 text-slate-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          user.is_active ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {user.is_active ? "Activo" : "Suspendido"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                          user.is_active
                            ? "bg-yellow-950/20 hover:bg-yellow-950/40 border-yellow-500/20 text-yellow-500"
                            : "bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {user.is_active ? "[SUSPENDER]" : "[ACTIVAR]"}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-[11px] px-2 py-1 rounded transition-colors"
                      >
                        [EDITAR]
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 text-[11px] px-2 py-1 rounded transition-colors"
                      >
                        [ELIMINAR]
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Flotante */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-200 font-mono uppercase">
                {editingUser
                  ? "Modificar Credenciales de Cuenta"
                  : "Inicializar Nueva Cuenta de Usuario"}
              </h4>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-xs font-mono"
            >
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="usuario@weatherapp.com"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-2">
                  Contraseña{" "}
                  {editingUser && "(Dejar en blanco para conservar actual)"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-2">
                  Rol Jerárquico
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="user">Usuario Estándar (Client App)</option>
                  <option value="admin">
                    Administrador del Sistema (Web Panel)
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 px-4 py-2 rounded-lg cursor-pointer"
                >
                  [CANCELAR]
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg cursor-pointer"
                >
                  [GUARDAR TRANSACCIÓN]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
