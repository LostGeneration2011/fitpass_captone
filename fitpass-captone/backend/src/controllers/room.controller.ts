import { Request, Response } from "express";
import { RoomService } from "../services/room.service";

const roomService = new RoomService();

export const createRoom = async (req: Request, res: Response) => {
  try {
    const room = await roomService.createRoom(req.body);
    return res.status(201).json({ message: "Room created successfully", room });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await roomService.getAllRooms();
    return res.json({ rooms });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Room ID is required" });
    }
    const room = await roomService.getRoomById(id);
    return res.json({ room });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Room ID is required" });
    }
    const room = await roomService.updateRoom(id, req.body);
    return res.json({ message: "Room updated successfully", room });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Room ID is required" });
    }
    await roomService.deleteRoom(id);
    return res.json({ message: "Room deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getRoomSchedule = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const schedule = await roomService.getRoomSchedule(date as string);
    return res.json({ schedule });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const checkRoomAvailability = async (req: Request, res: Response) => {
  try {
    const { roomId, startTime, endTime, excludeSessionId } = req.body;
    
    if (!roomId || !startTime || !endTime) {
      return res.status(400).json({ error: "roomId, startTime, and endTime are required" });
    }

    const isAvailable = await roomService.checkRoomAvailability(
      roomId,
      new Date(startTime),
      new Date(endTime),
      excludeSessionId
    );

    return res.json({ available: isAvailable });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, available: false });
  }
};