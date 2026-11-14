import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { Logger } from '../utils/logger';

export class UserController {
  /**
   * Retrieves profile details for the authenticated user
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await UserService.updateProfile(userId, {});
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve user profile.' });
    }
  }

  /**
   * Updates profile preferences (displayName, themePreference, timezone)
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { displayName, themePreference, timezone, avatarUrl } = req.body;
      const user = await UserService.updateProfile(userId, {
        displayName,
        themePreference,
        timezone,
        avatarUrl,
      });

      res.json({ user, message: 'Profile updated successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }

  /**
   * Handles avatar upload via raw body or base64 JSON payload
   */
  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      let buffer: Buffer;

      if (req.body && req.body.imageBase64) {
        // Base64 encoded payload: data:image/png;base64,...
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else {
        res.status(400).json({ error: 'No image data provided. Provide base64 string or binary buffer.' });
        return;
      }

      const avatarUrl = await UserService.saveAvatar(userId, buffer);
      res.json({ avatarUrl, message: 'Avatar updated successfully.' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to upload avatar.' });
    }
  }

  /**
   * Secure password change
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Both current and new passwords are required.' });
        return;
      }

      const result = await UserService.changePassword(userId, currentPassword, newPassword);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to change password.' });
    }
  }

  /**
   * Full data export in JSON format
   */
  static async exportData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dump = await UserService.exportUserData(userId);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="codeprep-export-${new Date().toISOString().split('T')[0]}.json"`
      );
      res.json(dump);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export user data.' });
    }
  }

  /**
   * Restores user progress, submissions, drafts, bookmarks & notes from JSON snapshot
   */
  static async importData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await UserService.importUserData(userId, req.body);
      res.json({
        message: 'Backup restored successfully.',
        ...result,
      });
    } catch (error) {
      Logger.error('UserController', 'Failed to import backup data', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to restore backup data.',
      });
    }
  }
}

