import { useEffect, useState } from "react";
import axios from "axios";
import { Activity, Users, Cpu, Wifi, Clock, AlertCircle, ChevronRight } from "lucide-react";

/* ================= TYPES ================= */

interface Salle {
  id: string;
  nom: string;
}

interface EtatSalle {
  id: string;
  occupe: boolean;
  nombre: number;
  debutOccupation: string; // ISO date
}

interface LogItem {
  id: string;
  salleId: string;
  message: string;
  timestamp: string;
}

/* ================= MOCK DATA ================= */

const mockSalles: Salle[] = [
  { id: "01", nom: "Salle 01" },
  { id: "02", nom: "Salle 02" },
];

const mockEtat: EtatSalle = {
  id: "01",
  occupe: true,
  nombre: 5,
  debutOccupation: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min
};

const mockLogs: LogItem[] = [
  {
    id: "1",
    salleId: "01",
    message: "Entrée détectée",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    salleId: "01",
    message: "Salle occupée",
    timestamp: new Date().toISOString(),
  },
];

/* ================= COMPONENT ================= */

export default function Dashboard() {
  const [salles, setSalles] = useState<Salle[]>([]);
  const [selectedSalle, setSelectedSalle] = useState<string>("01");
  const [etat, setEtat] = useState<EtatSalle | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [apiDown, setApiDown] = useState(false);

  /* ================= FETCH ================= */

  const fetchData = async () => {
    try {
      setApiDown(false);

      const sallesRes = await axios.get("http://localhost:3000/salles");
      const etatRes = await axios.get(
        `http://localhost:3000/etat/${selectedSalle}`
      );
      const logsRes = await axios.get(
        `http://localhost:3000/logs/${selectedSalle}`
      );

      setSalles(sallesRes.data);
      setEtat(etatRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.warn("API unreachable → using mock data");
      setApiDown(true);

      setSalles(mockSalles);
      setEtat(mockEtat);
      setLogs(mockLogs);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedSalle]);

  /* ================= UTILS ================= */

  const getDuration = (start: string) => {
    const diff = Date.now() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  /* ================= UI ================= */

  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col overflow-hidden">
      {/* HEADER - TRÈS COMPACT */}
      <header className="bg-white border-b border-gray-200 px-4 py-1.5 flex justify-between items-center shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <h1 className="text-sm font-semibold text-gray-700">
              IoT Classroom
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-green-600 text-xs font-medium">LIVE</span>
          </div>
        </div>
        {apiDown && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-600 text-xs">
              Mode hors-ligne
            </span>
          </div>
        )}
      </header>

      {/* MAIN - PLEINE HAUTEUR RESTANTE */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ================= LEFT SECTION ================= */}
          <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* STATS CARD */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-xs font-medium">SALLES ACTIVES</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-600">{salles.length}</span>
                  <span className="text-gray-400 text-xs">/ 10</span>
                </div>
              </div>
            </div>

            {/* ETAT SALLE CARD */}
            {etat && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    ÉTAT · SALLE {selectedSalle}
                  </h2>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600 text-xs">STATUS</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        etat.occupe
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-green-50 text-green-600 border border-green-200"
                      }`}
                    >
                      {etat.occupe ? "OCCUPÉ" : "LIBRE"}
                    </span>
                  </div>

                  {etat.occupe && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-xs">OCCUPANTS</span>
                        <span className="text-xl font-bold text-blue-600">{etat.nombre}</span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-xs">DEPUIS</span>
                        <span className="text-gray-700 text-sm">
                          {new Date(etat.debutOccupation).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 text-xs">DURÉE</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold text-gray-700 text-sm">{getDuration(etat.debutOccupation)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= RIGHT SECTION ================= */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* SELECT SALLE CARD */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex-shrink-0">
              <label className="text-gray-600 text-xs font-medium mb-1.5 block">
                SÉLECTIONNER SALLE
              </label>
              <select
                value={selectedSalle}
                onChange={(e) => setSelectedSalle(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {salles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* LOGS CARD */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <h2 className="font-semibold text-gray-700 text-sm">LOGS SYSTÈME</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 bg-gray-50 rounded border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-1.5 flex-1">
                        <ChevronRight className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700">
                          {log.message}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER - ULTRA COMPACT */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1 flex-shrink-0">
        <p className="text-gray-400 text-[10px] text-center">
          IoT Monitoring System · ESP32 · Real-time Data
        </p>
      </footer>
    </div>
  );
}