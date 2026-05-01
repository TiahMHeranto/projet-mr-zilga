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
  Calendar,
  ChevronDown,
  Cpu,
  Filter,
  History,
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

interface StatusPeriod {
  startTime: string;
  endTime: string;
  status: "libre" | "occupé";
}

interface DailyHistory {
  date: string;
  dateRaw: string; // Store raw date for comparison
  periods: StatusPeriod[];
}

/* ================= API ================= */

const API = "http://localhost:3000/api";

/* ================= HELPER FUNCTIONS ================= */

// Format time to HH:MM
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Format date to DD/MM/YYYY
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Get current time in HH:MM format
const getCurrentTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// Check if a date string (DD/MM/YYYY) is today
const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const [day, month, year] = dateStr.split("/");
  return (
    parseInt(day) === today.getDate() &&
    parseInt(month) === today.getMonth() + 1 &&
    parseInt(year) === today.getFullYear()
  );
};

// Parse logs to generate status periods
const generateStatusHistory = (logs: LogItem[]): DailyHistory[] => {
  if (!logs.length) return [];

  // Sort logs by date_heure
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()
  );

  // Build timeline of events that change status
  interface StatusChange {
    time: Date;
    newStatus: "libre" | "occupé";
    occupantCount: number;
  }

  const changes: StatusChange[] = [];
  let currentCount = 0;

  // Process each log to determine status changes
  for (const log of sortedLogs) {
    const eventTime = new Date(log.date_heure);
    let newCount = currentCount;

    if (log.event === "entrée détectée" || log.event === "entrΘe dΘtectΘe") {
      newCount = currentCount + 1;
    } else if (log.event === "sortie détectée" || log.event === "sortie dΘtectΘe") {
      newCount = Math.max(0, currentCount - 1);
    }

    const newStatus = newCount >= 5 ? "occupé" : "libre";
    const currentStatus = currentCount >= 5 ? "occupé" : "libre";

    // Only record change if status actually changed
    if (newStatus !== currentStatus) {
      changes.push({
        time: eventTime,
        newStatus,
        occupantCount: newCount,
      });
    }

    currentCount = newCount;
  }

  if (changes.length === 0) {
    // No status changes, determine single status based on final count
    const finalStatus = currentCount >= 5 ? "occupé" : "libre";
    const firstLogDate = sortedLogs[0]?.date_heure || new Date().toISOString();
    const dateFormatted = formatDate(firstLogDate);
    const dateRaw = firstLogDate.split("T")[0];
    
    // For today, end time is current time; for other days, it's 23:59
    const endTime = isToday(dateFormatted) ? getCurrentTime() : "23:59";
    
    return [
      {
        date: dateFormatted,
        dateRaw,
        periods: [
          {
            startTime: "00:00",
            endTime,
            status: finalStatus,
          },
        ],
      },
    ];
  }

  // Group changes by date
  const changesByDate: Map<string, StatusChange[]> = new Map();

  for (const change of changes) {
    const dateKey = change.time.toISOString().split("T")[0];
    if (!changesByDate.has(dateKey)) {
      changesByDate.set(dateKey, []);
    }
    changesByDate.get(dateKey)!.push(change);
  }

  const result: DailyHistory[] = [];

  // Add start of day and end of day times
  for (const [dateStr, dayChanges] of changesByDate) {
    const periods: StatusPeriod[] = [];
    let currentStatus: "libre" | "occupé" = "libre";
    let lastTime = "00:00";

    // Sort changes by time
    dayChanges.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Process each change
    for (let i = 0; i < dayChanges.length; i++) {
      const change = dayChanges[i];
      const changeTimeStr = formatTime(change.time.toISOString());

      // Add period from lastTime to changeTime
      if (changeTimeStr !== lastTime) {
        periods.push({
          startTime: lastTime,
          endTime: changeTimeStr,
          status: currentStatus,
        });
      }

      // Update status
      currentStatus = change.newStatus;
      lastTime = changeTimeStr;
    }

    // Determine end time for the day
    const dateFormatted = formatDate(dateStr);
    const endTimeForDay = isToday(dateFormatted) ? getCurrentTime() : "23:59";

    // Add final period from last change to end of day (or current time for today)
    if (lastTime !== endTimeForDay) {
      periods.push({
        startTime: lastTime,
        endTime: endTimeForDay,
        status: currentStatus,
      });
    }

    // Clean up periods: if start and end same, skip
    const filteredPeriods = periods.filter(
      (p) => p.startTime !== p.endTime
    );

    // Merge consecutive periods with same status
    const mergedPeriods: StatusPeriod[] = [];
    for (const period of filteredPeriods) {
      if (mergedPeriods.length === 0) {
        mergedPeriods.push(period);
      } else {
        const last = mergedPeriods[mergedPeriods.length - 1];
        if (last.status === period.status && last.endTime === period.startTime) {
          last.endTime = period.endTime;
        } else {
          mergedPeriods.push(period);
        }
      }
    }

    result.push({
      date: dateFormatted,
      dateRaw: dateStr,
      periods: mergedPeriods,
    });
  }

  // Sort by date descending
  result.sort((a, b) => {
    return b.dateRaw.localeCompare(a.dateRaw);
  });

  return result;
};

/* ================= COMPONENT ================= */

export default function HistoryLogs() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const location = useLocation();

  /* ================= FETCH SALLES ================= */
  const fetchSalles = async () => {
    try {
      const res = await axios.get(`${API}/salle`);
      const data = res.data.data;
      const sallesArray = Array.isArray(data) ? data : [];
      setSalles(sallesArray);
      if (sallesArray.length > 0 && !selectedSalle) {
        setSelectedSalle(sallesArray[0]);
      }
    } catch (err) {
      console.error(err);
      setApiDown(true);
    }
  };

  /* ================= FETCH LOGS ================= */
  const fetchLogs = async (salleId: number) => {
    try {
      setLoading(true);
      setApiDown(false);
      const res = await axios.get(`${API}/logs/${salleId}`);
      const data = res.data.data;
      const logsArray = Array.isArray(data) ? data : [];
      setLogs(logsArray);
    } catch (err) {
      console.error(err);
      setApiDown(true);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= GENERATE HISTORY WHEN LOGS CHANGE ================= */
  useEffect(() => {
    if (logs.length > 0) {
      const generatedHistory = generateStatusHistory(logs);
      setHistory(generatedHistory);
    } else {
      setHistory([]);
    }
  }, [logs]);

  /* ================= INIT ================= */
  useEffect(() => {
    fetchSalles();
  }, []);

  useEffect(() => {
    if (selectedSalle) {
      fetchLogs(selectedSalle.id);
    }
  }, [selectedSalle]);

  /* ================= FILTER HISTORY BY DATE ================= */
  const filteredHistory = filterDate
    ? history.filter((day) => day.date === filterDate)
    : history;

  /* ================= UI HELPERS ================= */
  const getStatusColor = (status: string) => {
    return status === "occupé"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-green-100 text-green-700 border-green-200";
  };

  const getStatusBadge = (status: string) => {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
          status
        )}`}
      >
        {status === "occupé" ? (
          <DoorOpen className="w-3 h-3" />
        ) : (
          <Home className="w-3 h-3" />
        )}
        {status}
      </span>
    );
  };

  // Get unique dates for filter dropdown
  const uniqueDates = [...new Set(history.map((day) => day.date))].sort(
    (a, b) => {
      const [dayA, monthA, yearA] = a.split("/");
      const [dayB, monthB, yearB] = b.split("/");
      return (
        new Date(`${yearB}-${monthB}-${dayB}`).getTime() -
        new Date(`${yearA}-${monthA}-${dayA}`).getTime()
      );
    }
  );

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

        <nav className="flex-1 p-3 space-y-1">
          <Link to="/">
            <div
              className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                location.pathname === "/"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </div>
          </Link>

          <Link to="/salles">
            <div
              className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                location.pathname === "/salles"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              Room Management
            </div>
          </Link>

          <Link to="/history">
            <div
              className={`px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                location.pathname === "/history"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <History className="w-4 h-4" />
              Status History
            </div>
          </Link>

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
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                !apiDown ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
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
              Room Status History
            </h1>
            <p className="text-xs text-gray-500">
              View historical status changes by room and date
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${
                !apiDown
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  !apiDown ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                }`}
              ></div>
              <span
                className={`text-xs font-medium ${
                  !apiDown ? "text-green-700" : "text-yellow-700"
                }`}
              >
                {!apiDown ? "ONLINE" : "CONNECTING..."}
              </span>
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
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Filters:
                </span>
              </div>

              {/* Room Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Room:</label>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  onChange={(e) => {
                    const salle = salles.find(
                      (s) => s.id === Number(e.target.value)
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

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <label className="text-sm text-gray-600">Date:</label>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                >
                  <option value="">All Dates</option>
                  {uniqueDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => selectedSalle && fetchLogs(selectedSalle.id)}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* History Display */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">
                  {selectedSalle?.code_salle || "Select a room"} - Status Timeline
                </h2>
                {selectedSalle && (
                  <div className="flex items-center gap-2">
                    <span className="text-blue-100 text-xs">Current:</span>
                    {getStatusBadge(selectedSalle.statut)}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading history...</p>
                </div>
              ) : !selectedSalle ? (
                <div className="text-center py-12">
                  <DoorOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Please select a room to view history</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No status history available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {logs.length === 0
                      ? "No logs found for this room"
                      : "No status changes recorded for the selected date"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredHistory.map((day, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-100 rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <h3 className="font-medium text-gray-800">
                            {day.date}
                            {isToday(day.date) && (
                              <span className="ml-2 text-xs text-blue-500 font-normal">
                                (Live - updates in real time)
                              </span>
                            )}
                          </h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          {day.periods.map((period, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    period.status === "occupé"
                                      ? "bg-red-500"
                                      : "bg-green-500"
                                  }`}
                                ></div>
                                <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                                  {period.status === "occupé"
                                    ? "Occupé"
                                    : "Libre"}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-mono">
                                  {period.startTime}
                                </span>
                                <span className="mx-2 text-gray-400">→</span>
                                <span className="font-mono">
                                  {period.endTime}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  Total days: {filteredHistory.length} | Total logs: {logs.length}
                </span>
                <span>
                  {selectedSalle
                    ? `Last updated: ${new Date().toLocaleTimeString()}`
                    : "Select a room"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}