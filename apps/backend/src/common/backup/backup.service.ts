import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  // Tạo backup database
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.sql`;
      
      // Tạo backup bằng pg_dump
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const command = `pg_dump -h localhost -U nhatoi_user -d nha_toierp > /tmp/${backupFileName}`;
      
      await execAsync(command);
      
      return `/tmp/${backupFileName}`;
    } catch (error) {
      console.error('Backup error:', error);
      throw new Error('Failed to create backup');
    }
  }

  // Restore từ backup
  async restoreBackup(backupFilePath: string): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const command = `psql -h localhost -U nhatoi_user -d nha_toierp < ${backupFilePath}`;
      
      await execAsync(command);
      
      return true;
    } catch (error) {
      console.error('Restore error:', error);
      throw new Error('Failed to restore backup');
    }
  }

  // Lấy danh sách backup
  async listBackups(): Promise<string[]> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const backupDir = '/tmp';
      const files = fs.readdirSync(backupDir);
      
      return files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .sort()
        .reverse(); // Mới nhất trước
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  // Xóa backup cũ
  async cleanupOldBackups(keepCount: number = 7): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > keepCount) {
        const fs = require('fs');
        const filesToDelete = backups.slice(keepCount);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(`/tmp/${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}