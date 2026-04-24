import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { ActivityImageDto, UpdateActivityImageDto, UploadActivityImagesPayload } from '../types/activity-image-types';

export const activityImageApi = {
  upload: async (activityId: number, payload: UploadActivityImagesPayload): Promise<ActivityImageDto[]> => {
    const formData = new FormData();
    
    payload.files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (payload.resimAciklamalar) {
      payload.resimAciklamalar.forEach((aciklama) => {
        formData.append('resimAciklamalar', aciklama);
      });
    }

    const response = await api.post<ApiResponse<ActivityImageDto[]>>(
      `/api/ActivityImage/upload/${activityId}`,
      formData
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Resimler yüklenemedi');
  },

  getByActivityId: async (activityId: number): Promise<ActivityImageDto[]> => {
    const response = await api.get<ApiResponse<ActivityImageDto[]>>(`/api/ActivityImage/by-activity/${activityId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Resimler yüklenemedi');
  },

  update: async (id: number, data: UpdateActivityImageDto): Promise<ActivityImageDto> => {
    const response = await api.put<ApiResponse<ActivityImageDto>>(`/api/ActivityImage/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Resim güncellenemedi');
  },

  delete: async (id: number): Promise<void> => {
    const response = await api.delete<ApiResponse<object>>(`/api/ActivityImage/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Resim silinemedi');
    }
  },
};
