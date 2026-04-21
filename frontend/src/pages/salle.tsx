import { useEffect, useState } from "react";

import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Home,
  Activity,
  Wifi,
  Clock,
  AlertCircle,
  RefreshCw,
  DoorOpen,
  Settings,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Search,
  ChevronDown,
  Cpu,
  Users,
  Calendar,
} from "lucide-react";

/* ================= TYPES ================= */

interface Salle {
  id: number;
  code_salle: string;
  statut: "libre" | "occupé";
  nombre_occupant: number;
  updated_at: string;
}

/* ================= API ================= */

const API = "http://localhost:3000/api";

/* ================= COMPONENT ================= */

export default function SalleManagement() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiDown, setApiDown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    code_salle: "",
    nombre_occupant: 0,
  });
  const [formErrors, setFormErrors] = useState<{ code_salle?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  /* ================= FETCH SALLES ================= */

  const fetchSalles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/salle`);
      const data = res.data.data;
      setSalles(data);
      setApiDown(false);
    } catch (err) {
      console.error(err);
      setApiDown(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalles();
  }, []);

  /* ================= CRUD OPERATIONS ================= */

  const handleAddSalle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code_salle.trim()) {
      setFormErrors({ code_salle: "Room code is required" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/salle`, {
        code_salle: formData.code_salle.toUpperCase(),
      });
      
      await fetchSalles();
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setFormErrors({ code_salle: "Room code already exists" });
      } else {
        alert("Failed to add room. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSalle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSalle) return;

    setSubmitting(true);
    try {
      await axios.put(`${API}/salle/${selectedSalle.id}`, {
        nombre_occupant: formData.nombre_occupant,
      });
      
      await fetchSalles();
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to update room. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSalle = async () => {
    if (!selectedSalle) return;

    setSubmitting(true);
    try {
      await axios.delete(`${API}/salle/${selectedSalle.id}`);
      await fetchSalles();
      setIsDeleteModalOpen(false);
      setSelectedSalle(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete room. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (salle: Salle) => {
    setSelectedSalle(salle);
    setFormData({
      code_salle: salle.code_salle,
      nombre_occupant: salle.nombre_occupant,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (salle: Salle) => {
    setSelectedSalle(salle);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ code_salle: "", nombre_occupant: 0 });
    setFormErrors({});
    setSelectedSalle(null);
  };

  /* ================= FILTERING ================= */

  const filteredSalles = salles.filter(salle =>
    salle.code_salle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (statut: string) => {
    return statut === "occupé" 
      ? "bg-red-50 text-red-700 border-red-200" 
      : "bg-green-50 text-green-700 border-green-200";
  };

  const getStatusIcon = (statut: string) => {
    return statut === "occupé" ? <DoorOpen className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />;
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                IoT Sentinel
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <Link to="/">
            <div className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${location.pathname === "/"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
              }`}>
              <Home className="w-4 h-4" />
              Dashboard
            </div>
          </Link>

          <Link to="/salles">
            <div className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${location.pathname === "/salles"
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
              }`}>
              <DoorOpen className="w-4 h-4" />
              Room Management
            </div>
          </Link>

          <div className="px-3 py-2 text-gray-400 rounded-lg flex items-center gap-3 text-sm cursor-not-allowed">
            <Activity className="w-4 h-4" />
            Live Logs
            <span className="text-xs text-gray-400 ml-auto">Soon</span>
          </div>

          <div className="px-3 py-2 text-gray-400 rounded-lg flex items-center gap-3 text-sm cursor-not-allowed">
            <Settings className="w-4 h-4" />
            Settings
            <span className="text-xs text-gray-400 ml-auto">Soon</span>
          </div>
        </nav>

        <div className="p-3 m-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">System</span>
            <Wifi className="w-3 h-3 text-green-500" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-700">ESP32 • PostgreSQL</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-3 flex justify-between items-center h-16">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              Room Management
            </h1>
            <p className="text-xs text-gray-500">
              Manage all rooms and their configurations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded-lg border border-green-200">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">LIVE</span>
              {apiDown && (
                <span className="text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-xs">API Down</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Actions Bar */}
          <div className="mb-6 flex justify-between items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Room
            </button>
          </div>

          {/* Rooms Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room Code</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupants</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Loading rooms...</p>
                      </td>
                    </tr>
                  ) : filteredSalles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No rooms found</p>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-3 text-blue-600 text-sm hover:text-blue-700 font-medium"
                        >
                          Add your first room
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredSalles.map((salle) => (
                      <tr key={salle.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">#{salle.id}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-800">{salle.code_salle}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(salle.statut)} border`}>
                            {getStatusIcon(salle.statut)}
                            {salle.statut}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-700">{salle.nombre_occupant} / 50</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(salle.updated_at).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(salle)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit occupants"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(salle)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete room"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
            <span>Total rooms: {filteredSalles.length}</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </main>

      {/* ================= ADD MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Add New Room</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddSalle} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Code *
                </label>
                <input
                  type="text"
                  value={formData.code_salle}
                  onChange={(e) => {
                    setFormData({ ...formData, code_salle: e.target.value.toUpperCase() });
                    setFormErrors({});
                  }}
                  placeholder="e.g., A101, B202"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
                {formErrors.code_salle && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.code_salle}</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {isEditModalOpen && selectedSalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Room: {selectedSalle.code_salle}</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditSalle} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Occupants
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.nombre_occupant}
                  onChange={(e) => setFormData({ ...formData, nombre_occupant: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Status will be automatically set to "occupé" if occupants ≥ 5
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    Current status: <span className={`font-medium ${selectedSalle.statut === 'occupé' ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedSalle.statut}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    New status will be: <span className={`font-medium ${formData.nombre_occupant >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {formData.nombre_occupant >= 5 ? 'occupé' : 'libre'}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Updating..." : "Update Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE MODAL ================= */}
      {isDeleteModalOpen && selectedSalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-5">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-center text-lg font-semibold text-gray-800 mb-2">
                Delete Room
              </h2>
              <p className="text-center text-sm text-gray-600 mb-6">
                Are you sure you want to delete room <span className="font-medium">{selectedSalle.code_salle}</span>?<br />
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedSalle(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSalle}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}