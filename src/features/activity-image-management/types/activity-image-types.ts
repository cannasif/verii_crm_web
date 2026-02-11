import { z } from 'zod';

export interface ActivityImageDto {
  id: number;
  activityId: number;
  resimAciklama?: string;
  resimUrl: string;
  createdDate?: string;
  updatedDate?: string;
}

export interface UpdateActivityImageDto {
  activityId: number;
  resimAciklama?: string;
  resimUrl: string;
}

export interface UploadActivityImagesPayload {
  files: File[];
  resimAciklamalar?: string[];
}

export interface FileWithPreview {
  file: File;
  preview: string;
  aciklama: string;
}

export const activityImageUpdateSchema = z.object({
  resimAciklama: z
    .string()
    .max(500, 'activity-image:descriptionMaxLength')
    .optional(),
});

export type ActivityImageUpdateSchema = z.infer<typeof activityImageUpdateSchema>;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
