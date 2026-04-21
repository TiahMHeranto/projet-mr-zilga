import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import io, { Socket } from "socket.io-client";
import {
  Home,
  Activity,
  Wifi,
  Clock,
  AlertCircle,
  RefreshCw,
  DoorOpen,
  Settings,
  Bell,
  ChevronDown,
  Cpu,
} from "lucide-react";

/* ================= TYPES ================= */

interface Salle {
  id: number;
  code_salle: string;
  statut: "libre" | "occupé";
  nombre_occupant: number;
  updated_at: string;
}

interface LogItem {
  id: number;
  salle_id: number;
  event: string;
  date_heure: string;
  details?: string;
  created_at: string;
}

/* ================= API ================= */

const API = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

/* ================= COMPONENT ================= */

export default function Dashboard() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiDown, setApiDown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to avoid stale closures
  const selectedSalleRef = useRef(selectedSalle);
  const logsRef = useRef(logs);

  // Update refs when state changes
  useEffect(() => {
    selectedSalleRef.current = selectedSalle;
  }, [selectedSalle]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  /* ================= FETCH SALLES ================= */

  const fetchSalles = async () => {
    try {
      const res = await axios.get(`${API}/salle`);
      const data = res.data.data;
      const sallesArray = Array.isArray(data) ? data : [];
      setSalles(sallesArray);

      if (!selectedSalle && sallesArray.length > 0) {
        setSelectedSalle(sallesArray[0]);
      }
    } catch (err) {
      console.error(err);
      setApiDown(true);
      setSalles([]);
    }
  };

  /* ================= FETCH LOGS ================= */

  const fetchLogs = async (salleId: number) => {
    try {
      setApiDown(false);
      setLoading(true);
      const res = await axios.get(`${API}/logs/${salleId}`);
      const data = res.data.data;
      const logsArray = Array.isArray(data) ? data : [];
      setLogs(logsArray);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setApiDown(true);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE ROOM DATA ================= */
  const updateRoomData = useCallback((updatedRoom: any) => {
    console.log('Updating room data:', updatedRoom);
    
    // Update salles list
    setSalles(prevSalles =>
      prevSalles.map(salle =>
        salle.id === updatedRoom.salle_id || salle.id === updatedRoom.id
          ? {
              ...salle,
              statut: updatedRoom.statut,
              nombre_occupant: updatedRoom.nombre_occupant,
              updated_at: updatedRoom.updated_at || new Date().toISOString()
            }
          : salle
      )
    );

    // Update selected salle if it's the current one using ref to avoid stale closure
    const currentSelectedSalle = selectedSalleRef.current;
    if (currentSelectedSalle && (currentSelectedSalle.id === updatedRoom.salle_id || currentSelectedSalle.id === updatedRoom.id)) {
      setSelectedSalle(prev => prev ? {
        ...prev,
        statut: updatedRoom.statut,
        nombre_occupant: updatedRoom.nombre_occupant,
        updated_at: updatedRoom.updated_at || new Date().toISOString()
      } : null);
    }
  }, []);

  /* ================= HANDLE NEW LOG ================= */
  const handleNewLog = useCallback((newLog: LogItem) => {
    console.log('Handling new log:', newLog);
    console.log('Current selected salle:', selectedSalleRef.current);
    
    // Only add log if it's for the currently selected room using ref
    if (selectedSalleRef.current && newLog.salle_id === selectedSalleRef.current.id) {
      setLogs(prevLogs => {
        // Avoid duplicate logs
        if (prevLogs.some(log => log.id === newLog.id)) {
          return prevLogs;
        }
        return [newLog, ...prevLogs];
      });
      setLastUpdated(new Date());
    } else {
      console.log('Log not for selected room, ignoring');
    }
  }, []);

  /* ================= SOCKET.IO SETUP ================= */
  useEffect(() => {
    // Initialize socket connection with better error handling
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setIsConnected(true);
      setApiDown(false);

      // Join room for selected salle using ref
      const currentSelectedSalle = selectedSalleRef.current;
      if (currentSelectedSalle) {
        newSocket.emit('join_room', currentSelectedSalle.id);
        console.log(`Joined room: room_${currentSelectedSalle.id}`);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setApiDown(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setApiDown(false);
    });

    // Listen for room updates
    newSocket.on('room_updated', (data) => {
      console.log('Room updated (global):', data);
      updateRoomData(data);
    });

    newSocket.on('room_updated_specific', (data) => {
      console.log('Room updated (specific):', data);
      updateRoomData(data);
    });

    // Listen for new logs
    newSocket.on('new_log', (data) => {
      console.log('New log (global):', data);
      handleNewLog(data);
    });

    newSocket.on('new_log_specific', (data) => {
      console.log('New log (specific):', data);
      handleNewLog(data);
    });

    // Cleanup on unmount
    return () => {
      const currentSelectedSalle = selectedSalleRef.current;
      if (currentSelectedSalle && newSocket.connected) {
        newSocket.emit('leave_room', currentSelectedSalle.id);
      }
      newSocket.disconnect();
    };
  }, [updateRoomData, handleNewLog]); // Add dependencies

  // Handle room joining/leaving when selectedSalle changes
  useEffect(() => {
    if (socket && socket.connected && selectedSalle) {
      // Leave previous room (server will handle leaving all rooms)
      socket.emit('leave_room', selectedSalle.id);
      
      // Join new room
      socket.emit('join_room', selectedSalle.id);
      console.log(`Joined room: room_${selectedSalle.id}`);
    }
  }, [selectedSalle, socket]);

  /* ================= INIT ================= */

  useEffect(() => {
    fetchSalles();
  }, []);

  useEffect(() => {
    if (!selectedSalle) return;
    fetchLogs(selectedSalle.id);
  }, [selectedSalle]);

  /* ================= UI VALUES ================= */

  const getStatusColor = (statut: string) => {
    return statut === "occupé"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-green-50 text-green-700 border-green-200";
  };

  const getStatusIcon = (statut: string) => {
    return statut === "occupé" ? <DoorOpen className="w-4 h-4" /> : <Home className="w-4 h-4" />;
  };

  const occupancyRate = selectedSalle
    ? Math.min((selectedSalle.nombre_occupant / 50) * 100, 100)
    : 0;

  // Safe check for logs.map
  const logsArray = Array.isArray(logs) ? logs : [];

  const location = useLocation();

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col shadow-xl">
        {/* Logo Area - Compact */}
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

        {/* System Status */}
        <div className="p-3 m-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">System</span>
            <Wifi className="w-3 h-3 text-green-500" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">
              {isConnected ? 'Real-time • WebSocket' : 'ESP32 • PostgreSQL'}
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* COMPACT HEADER */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-3 flex justify-between items-center h-16">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              Room Overview
            </h1>
            <p className="text-xs text-gray-500">
              Real-time monitoring {isConnected && '• Live WebSocket'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className={`text-xs font-medium ${isConnected ? 'text-green-700' : 'text-yellow-700'}`}>
                {isConnected ? 'REAL-TIME' : 'CONNECTING...'}
              </span>
              {apiDown && (
                <span className="text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-xs">API Down</span>
                </span>
              )}
            </div>

            {/* Notification */}
            <button className="relative p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700">Admin</p>
                <p className="text-xs text-gray-500">System</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                AU
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-12 gap-5">

            {/* ================= LEFT CARDS ================= */}
            <div className="col-span-12 md:col-span-4 space-y-4">

              {/* SELECT ROOM */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Select Room
                </label>
                <select
                  className="w-full border border-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-700 text-sm"
                  onChange={(e) => {
                    const salle = salles.find(
                      s => s.id === Number(e.target.value)
                    );
                    if (salle) setSelectedSalle(salle);
                  }}
                  value={selectedSalle?.id || ""}
                >
                  {salles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code_salle}
                    </option>
                  ))}
                </select>
              </div>

              {/* ROOM DETAILS CARD */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5">
                  <h3 className="text-white font-semibold text-xs">Room Details</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Room Name</p>
                    <p className="text-xl font-bold text-gray-800">
                      {selectedSalle?.code_salle || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Current Status</p>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSalle?.statut || "libre")} border`}>
                      {getStatusIcon(selectedSalle?.statut || "libre")}
                      {selectedSalle?.statut || "-"}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Occupancy</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-800">
                        {selectedSalle?.nombre_occupant ?? 0}
                      </span>
                      <span className="text-xs text-gray-500">/ 50 max</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${occupancyRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK STATS */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Quick Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Rooms</span>
                    <span className="text-lg font-bold text-gray-800">{salles.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Occupied</span>
                    <span className="text-lg font-bold text-orange-600">
                      {salles.filter(s => s.statut === "occupé").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Free</span>
                    <span className="text-lg font-bold text-green-600">
                      {salles.filter(s => s.statut === "libre").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= LOGS SECTION ================= */}
            <div className="col-span-12 md:col-span-8">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-semibold text-gray-800 text-base">
                        Real-time Activity Logs
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Latest events for {selectedSalle?.code_salle || "selected room"}
                        {isConnected && <span className="text-green-600 ml-1">• Live updates</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {lastUpdated.toLocaleTimeString()}
                      </span>
                      <RefreshCw
                        className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => selectedSalle && fetchLogs(selectedSalle.id)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[calc(100vh-180px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-gray-500 text-xs">Loading logs...</p>
                      </div>
                    </div>
                  ) : logsArray.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No activity logs available</p>
                      <p className="text-xs text-gray-400 mt-1">Logs will appear here when events occur</p>
                    </div>
                  ) : (
                    logsArray.map((log, index) => (
                      <div
                        key={log.id || index}
                        className="group flex justify-between items-center p-2.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:shadow-sm cursor-pointer"
                        style={{
                          animation: `slideIn 0.3s ease-out forwards`,
                          animationDelay: `${index * 50}ms`,
                          opacity: 0,
                          transform: 'translateX(-10px)'
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {log.event || "Unknown event"}
                            </p>
                            {log.details && (
                              <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {log.date_heure ? new Date(log.date_heure).toLocaleTimeString() : "Just now"}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Stats */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Total events: {logsArray.length}</span>
                    <span className="text-gray-400">
                      {isConnected ? 'Real-time WebSocket • Instant updates' : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}