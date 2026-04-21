import { Request, Response } from "express";
import { io } from "../server"; // Import Socket.io instance
import {
  createLog as insertLog,
  getAllLogs,
  getLogsBySalle,
} from "../models/Log";
import {
  findSalleById,
  updateSalleStatus,
} from "../models/Salle";
import { log } from "../utils/logger";

/* =========================
   CREATE LOG
========================= */
export const createLog = async (req: Request, res: Response) => {
  try {
    const { salle_id, event_type } = req.body;

    if (!salle_id) {
      return res.status(400).json({
        success: false,
        message: "salle_id is required",
      });
    }

    if (!event_type) {
      return res.status(400).json({
        success: false,
        message: "event_type is required",
      });
    }

    // Check if the room exists
    const salle = await findSalleById(Number(salle_id));
    if (!salle) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    let event = "";
    let details = "";
    let newOccupantCount = salle.nombre_occupant;

    switch (event_type) {
      case "entry":
        event = "entrée détectée";
        details = "Person entered the room";
        // Increment occupant count
        newOccupantCount = salle.nombre_occupant + 1;
        break;

      case "exit":
        event = "sortie détectée";
        details = "Person left the room";
        // Decrement occupant count (minimum 0)
        newOccupantCount = Math.max(0, salle.nombre_occupant - 1);
        break;

      case "motion":
        event = "mouvement détecté";
        details = "Motion detected by PIR sensor";
        // Motion doesn't change occupancy
        newOccupantCount = salle.nombre_occupant;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid event_type",
        });
    }

    // Determine new status based on occupant count
    // Room is "libre" if occupants < 5, otherwise "occupé"
    const newStatus = newOccupantCount >= 5 ? "occupé" : "libre";

    // Variable to store updated room data
    let updatedRoom = null;

    // Update room occupancy if changed (for entry/exit events)
    if (event_type === "entry" || event_type === "exit") {
      updatedRoom = await updateSalleStatus(
        Number(salle_id),
        newStatus,
        newOccupantCount
      );

      // EMIT REAL-TIME ROOM UPDATE
      const roomUpdateData = {
        id: salle.id,
        salle_id: Number(salle_id),
        code_salle: salle.code_salle,
        statut: newStatus,
        nombre_occupant: newOccupantCount,
        updated_at: new Date(),
        old_occupant: salle.nombre_occupant,
        event_type: event_type
      };

      // Broadcast to all connected clients
      io.emit('room_updated', roomUpdateData);
      
      // Also emit to room-specific channel
      io.to(`room_${salle_id}`).emit('room_updated_specific', roomUpdateData);

      log("Room occupancy updated", {
        event: "room_occupancy_updated",
        salle_id,
        event_type,
        old_occupant: salle.nombre_occupant,
        new_occupant: newOccupantCount,
        status: newStatus,
        threshold: 5,
      });
    }

    // Create the log entry
    const newLog = await insertLog({
      salle_id: Number(salle_id),
      event,
      date_heure: new Date(),
      details,
    });

    // EMIT REAL-TIME LOG UPDATE
    const logData = {
      ...newLog,
      salle_id: Number(salle_id),
      event_type: event_type,
      room_status: newStatus,
      occupant_count: newOccupantCount
    };

    // Broadcast to all connected clients
    io.emit('new_log', logData);
    
    // Also emit to room-specific channel
    io.to(`room_${salle_id}`).emit('new_log_specific', logData);

    log("IoT log created", {
      event: "iot_log_created",
      salle_id,
      event_type,
      ip: req.ip,
      occupant_count: newOccupantCount,
      room_status: newStatus,
    });

    return res.status(201).json({
      success: true,
      data: {
        log: newLog,
        room: {
          id: salle.id,
          code_salle: salle.code_salle,
          statut: newStatus,
          nombre_occupant: newOccupantCount,
        }
      },
    });

  } catch (err: any) {
    console.error("Error in createLog:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create log",
      error: err.message,
    });
  }
};

/* =========================
   GET LOGS
========================= */
export const fetchLogs = async (_req: Request, res: Response) => {
  try {
    const logs = await getAllLogs();

    return res.json({
      success: true,
      count: logs.length,
      data: logs,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
      error: err.message,
    });
  }
};

/* =========================
   GET LOGS BY SALLE
========================= */
export const fetchLogsBySalle = async (req: Request, res: Response) => {
  try {
    const { salle_id } = req.params;

    if (!salle_id) {
      return res.status(400).json({
        success: false,
        message: "salle_id is required",
      });
    }

    const salleIdNumber = Number(salle_id);
    
    if (isNaN(salleIdNumber)) {
      return res.status(400).json({
        success: false,
        message: "salle_id must be a valid number",
      });
    }

    const logs = await getLogsBySalle(salleIdNumber);

    return res.json({
      success: true,
      count: logs.length,
      salle_id: salleIdNumber,
      data: logs,
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch logs for this room",
      error: err.message,
    });
  }
};