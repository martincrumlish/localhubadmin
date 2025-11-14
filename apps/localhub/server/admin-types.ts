// Admin-specific TypeScript types for LocalHub Admin System

export interface AdminUser {
  id: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  id: number;
  adminId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ProjectData {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdByAdminId: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: AdminUser;
  businessCount?: number;
}

export interface BusinessData {
  id: number;
  projectId: number;
  placeId: string;
  businessName: string;
  addedByAdminId: number;
  createdAt: Date;
  updatedAt: Date;
  addedBy?: AdminUser;
  project?: ProjectData;
}
