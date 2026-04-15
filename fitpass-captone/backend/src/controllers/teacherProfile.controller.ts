import { Request, Response } from 'express';
import { TeacherProfileService } from '../services/teacherProfile.service';

const teacherProfileService = new TeacherProfileService();

export const getTeacherProfile = async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.id;

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    const profile = await teacherProfileService.getTeacherProfile(teacherId);
    return res.json(profile);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateTeacherProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user as Express.UserPayload;
    const payload = req.body || {};

    const updated = await teacherProfileService.updateTeacherProfile(user, payload);
    return res.json({ data: updated, message: 'Teacher profile updated' });
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({ error: err.message });
  }
};
