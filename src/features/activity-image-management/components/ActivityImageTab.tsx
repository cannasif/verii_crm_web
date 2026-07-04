import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, Pencil, Trash2, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/axios';
import { useActivityImages } from '../hooks/useActivityImages';
import { useUploadActivityImages } from '../hooks/useUploadActivityImages';
import { useUpdateActivityImage } from '../hooks/useUpdateActivityImage';
import { useDeleteActivityImage } from '../hooks/useDeleteActivityImage';
import { ActivityImageUploadDialog } from './ActivityImageUploadDialog';
import { ActivityImageEditDialog } from './ActivityImageEditDialog';
import type { ActivityImageUpdateSchema } from '../types/activity-image-types';

interface ActivityImageTabProps {
  activityId: number | undefined;
  onCreateActivity?: () => Promise<number>;
  pendingImages?: { id: string; file: File; description: string; previewUrl: string }[];
  onAddPendingImages?: (images: { id: string; file: File; description: string; previewUrl: string }[]) => void;
  onRemovePendingImage?: (id: string) => void;
  onUpdatePendingImageDescription?: (id: string, description: string) => void;
  deferMode?: boolean;
  deletedExistingIds?: number[];
  onQueueDeleteExisting?: (id: number) => void;
  updatedExistingDescriptions?: Record<number, string>;
  onQueueUpdateExisting?: (id: number, description: string) => void;
}

export function ActivityImageTab({
  activityId,
  pendingImages,
  onAddPendingImages,
  onRemovePendingImage,
  onUpdatePendingImageDescription,
  deferMode,
  deletedExistingIds = [],
  onQueueDeleteExisting,
  updatedExistingDescriptions = {},
  onQueueUpdateExisting,
}: ActivityImageTabProps): ReactElement {
  const { t } = useTranslation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<{ id: string | number; resimUrl: string; resimAciklama?: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string | number; resimUrl: string; resimAciklama?: string } | null>(null);

  const isPendingMode = !activityId || deferMode;
  const { data: images = [], isLoading } = useActivityImages(activityId);
  const uploadMutation = useUploadActivityImages(activityId || 0);
  const updateMutation = useUpdateActivityImage(activityId || 0);
  const deleteMutation = useDeleteActivityImage(activityId || 0);

  const displayImages: { id: string | number; activityId: number; resimUrl: string; resimAciklama?: string }[] = isPendingMode
    ? [
        ...images.filter(img => !deletedExistingIds.includes(Number(img.id))).map(img => ({
          ...img,
          resimAciklama: updatedExistingDescriptions[Number(img.id)] ?? img.resimAciklama
        })),
        ...(pendingImages || []).map((img) => ({
          id: img.id,
          activityId: activityId || 0,
          resimUrl: img.previewUrl,
          resimAciklama: img.description,
        }))
      ]
    : images;

  const handleUploadClick = (): void => {
    setIsUploadDialogOpen(true);
  };

  const handleUpload = async (files: File[], descriptions: string[]): Promise<void> => {
    if (isPendingMode) {
      const newImages = files.map((file, idx) => {
        const id = `pending-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`;
        const previewUrl = URL.createObjectURL(file);
        return {
          id,
          file,
          description: descriptions[idx] || '',
          previewUrl,
        };
      });
      onAddPendingImages?.(newImages);
      setIsUploadDialogOpen(false);
      return;
    }

    if (!activityId) return;
    await uploadMutation.mutateAsync({
      files,
      resimAciklamalar: descriptions.length > 0 ? descriptions : undefined,
    });

    setIsUploadDialogOpen(false);
  };

  const handleEdit = (image: { id: string | number; resimUrl: string; resimAciklama?: string }): void => {
    setEditingImage(image);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: ActivityImageUpdateSchema): Promise<void> => {
    if (!editingImage) return;

    if (isPendingMode) {
      if (typeof editingImage.id === 'string' && editingImage.id.startsWith('pending-')) {
        onUpdatePendingImageDescription?.(editingImage.id, data.resimAciklama || '');
      } else {
        onQueueUpdateExisting?.(Number(editingImage.id), data.resimAciklama || '');
      }
      setIsEditDialogOpen(false);
      setEditingImage(null);
      return;
    }

    if (!activityId) return;
    await updateMutation.mutateAsync({
      id: Number(editingImage.id),
      data: {
        activityId,
        resimAciklama: data.resimAciklama,
        resimUrl: editingImage.resimUrl,
      },
    });

    setIsEditDialogOpen(false);
    setEditingImage(null);
  };

  const handleDelete = (image: { id: string | number; resimUrl: string; resimAciklama?: string }): void => {
    setImageToDelete(image);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = (): void => {
    if (imageToDelete) {
      if (isPendingMode) {
        if (typeof imageToDelete.id === 'string' && imageToDelete.id.startsWith('pending-')) {
          onRemovePendingImage?.(imageToDelete.id);
        } else {
          onQueueDeleteExisting?.(Number(imageToDelete.id));
        }
        setDeleteDialogOpen(false);
        setImageToDelete(null);
        return;
      }
      deleteMutation.mutate(Number(imageToDelete.id));
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const getFullImageUrl = (url: string): string => {
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground text-sm font-medium">
          {t('activity-image:loading')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('activity-image:title')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('activity-image:subtitle')}
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={uploadMutation.isPending}
          className="bg-[image:var(--crm-brand-gradient)] hover:opacity-90 text-white "
        >
          <Upload className="h-4 w-4 mr-2" />
          {t('activity-image:uploadImages')}
        </Button>
      </div>

      {displayImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              {t('activity-image:noImages')}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('activity-image:noImagesDescription')}
            </p>
          </div>
          <Button
            onClick={handleUploadClick}
            variant="outline"
            className="mt-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('activity-image:uploadFirstImage')}
          </Button>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('activity-image:preview')}
                </TableHead>
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('activity-image:description')}
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayImages.map((image) => (
                <TableRow key={image.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableCell className="w-32">
                    <div className="h-20 w-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <img
                        src={getFullImageUrl(image.resimUrl)}
                        alt={image.resimAciklama || 'Activity image'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const icon = document.createElement('div');
                            icon.innerHTML = '<svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            parent.appendChild(icon.firstChild!);
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {image.resimAciklama || '-'}
                      </p>
                      <a
                        href={getFullImageUrl(image.resimUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="truncate max-w-[200px]">{image.resimUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(image)}
                        className="h-8 w-8 text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(image)}
                        className="h-8 w-8 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ActivityImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleUpload}
        isLoading={uploadMutation.isPending}
      />

      <ActivityImageEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditSubmit}
        image={editingImage}
        isLoading={updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              {t('activity-image:deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              {t('activity-image:deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                t('common.delete.action')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
