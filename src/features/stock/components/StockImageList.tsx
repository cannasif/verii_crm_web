import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Trash2, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { useStockImages } from '../hooks/useStockImages';
import { useStockImageDelete } from '../hooks/useStockImageDelete';
import { useStockImageSetPrimary } from '../hooks/useStockImageSetPrimary';
import { getImageUrl } from '../utils/image-url';
import type { StockImageDto } from '../types';

interface StockImageListProps {
  stockId: number;
}

export function StockImageList({ stockId }: StockImageListProps): ReactElement {
  const { t } = useTranslation(['stock', 'common']);
  const { data: images, isLoading, isFetching } = useStockImages(stockId);
  const deleteImage = useStockImageDelete();
  const setPrimary = useStockImageSetPrimary();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<StockImageDto | null>(null);

  const handleDeleteClick = (image: StockImageDto): void => {
    setImageToDelete(image);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (imageToDelete) {
      await deleteImage.mutateAsync({
        id: imageToDelete.id,
        stockId,
      });
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const handleSetPrimary = async (image: StockImageDto): Promise<void> => {
    await setPrimary.mutateAsync({
      id: image.id,
      stockId,
    });
  };

  if (isLoading || isFetching) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
             <Skeleton className="h-48 w-full rounded-xl" />
             <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-1/2 rounded-lg" />
                    <Skeleton className="h-8 w-1/2 rounded-lg" />
                </div>
             </div>
          </div>
        ))}
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl bg-zinc-50/50 dark:bg-white/5 transition-all hover:bg-zinc-50 dark:hover:bg-white/10">
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm mb-4">
            <ImageIcon className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
            {t('stock.images.noImages')}
        </h3>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
            {t('stock.images.noImagesDesc')}
        </p>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {sortedImages.map((image) => (
          <div
            key={image.id}
            className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm hover:shadow-xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-300 overflow-hidden flex flex-col"
          >
            <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {image.isPrimary && (
                  <Badge
                    className="absolute top-3 left-3 z-10 bg-linear-to-r from-pink-600 to-orange-600 border-0 shadow-lg shadow-pink-500/30 text-white px-2 py-1"
                  >
                    <Star className="h-3 w-3 mr-1 fill-white" />
                    {t('stock.images.primary')}
                  </Badge>
                )}
                
                <img
                  src={getImageUrl(image.filePath) || ''}
                  alt={image.altText || image.stockName || 'Stock image'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f4f4f5"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23a1a1aa" font-family="sans-serif" font-size="12"%3EGörsel Yok%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
            </div>

            <div className="p-3 space-y-3 flex flex-col flex-1 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="relative">
                  <Input
                    type="text"
                    value={image.altText || ''}
                    readOnly
                    className="
                        h-8 text-xs 
                        bg-zinc-50/50 dark:bg-zinc-800/50 
                        border-zinc-200 dark:border-white/10
                        focus-visible:ring-0 focus-visible:border-zinc-300
                        text-zinc-600 dark:text-zinc-300
                    "
                    placeholder={t('stock.images.altText')}
                  />
              </div>

              <div className="flex gap-2 mt-auto">
                {!image.isPrimary ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-zinc-200 hover:border-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/20 transition-all"
                    onClick={() => handleSetPrimary(image)}
                    disabled={setPrimary.isPending}
                  >
                    {setPrimary.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <>
                            <Star className="h-3 w-3 mr-1.5" />
                            {t('stock.images.setPrimary')}
                        </>
                    )}
                  </Button>
                ) : (
                    <div className="flex-1 flex items-center justify-center h-8 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-md border border-emerald-100 dark:border-emerald-900/20">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        {t('stock.images.isPrimary')}
                    </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                  onClick={() => handleDeleteClick(image)}
                  disabled={deleteImage.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
                <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl">
                    {t('stock.images.deleteConfirm')}
                </DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {t('stock.images.deleteConfirmMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteImage.isPending}
              className="rounded-lg"
            >
              {t('stock.images.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteImage.isPending}
              className="rounded-lg bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
            >
              {deleteImage.isPending ? (
                 <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('stock.images.deleting')}
                  </>
                ) : (
                 t('stock.images.confirmDelete')
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
