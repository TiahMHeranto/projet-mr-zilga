// src/controllers/logController.ts
import { Request, Response } from "express";
import Log from "../models/Log";
import { log } from "../utils/logger";

export const createLog = async (req: Request, res: Response) => {
  try {
    const { eventType, count, isOccupied } = req.body;

    let message = "";
    console.log('Projet Zilga');

    switch (eventType) {
      case "entry":
        message = "Person entered the room";
        break;
      case "exit":
        message = "Person left the room";
        break;
      case "presence":
        message = "Motion detected in room";
        break;
      case "room_status":
        message = isOccupied ? "Room occupied" : "Room empty";
        break;
    }

    const newLog = await Log.create({
      eventType,
      count,
      isOccupied,
      message,
    });

    log("IoT log created", {
      event: "iot_log_created",
      eventType,
      count,
      isOccupied,
      ip: req.ip,
    });

    res.status(201).json(newLog);

  } catch (err: any) {
    log("IoT log creation failed", {
      event: "iot_log_error",
      error: err.message,
      stack: err.stack,
      ip: req.ip,
    });

    res.status(500).json({ message: "Failed to create log" });
  }
};