import type { AiAssistantAttachmentDto } from '../types/ai-assistant.types';

export const aiAssistantMaxImageSizeMb = 4;
export const aiAssistantMaxImageSizeBytes = aiAssistantMaxImageSizeMb * 1024 * 1024;

export const aiAssistantAllowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type AiAssistantSelectedAttachment = {
  fileName: string;
  contentType: string;
  size: number;
  base64Content: string;
};

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',').pop() ?? '' : result);
    };

    reader.onerror = () => reject(reader.error ?? new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2).replace(/\.00$/, '')} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }

  return `${bytes} B`;
}

export function createAttachmentMetadata(attachment: AiAssistantSelectedAttachment) {
  return {
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
  };
}

export function createAttachmentRequest(attachment: AiAssistantSelectedAttachment): AiAssistantAttachmentDto {
  return {
    ...createAttachmentMetadata(attachment),
    base64Content: attachment.base64Content,
  };
}
