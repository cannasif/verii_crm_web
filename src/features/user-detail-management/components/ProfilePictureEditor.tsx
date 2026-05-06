import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, RotateCw } from 'lucide-react';
import getCroppedImg from '../utils/canvas-utils';

interface ProfilePictureEditorProps {
  image: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: Blob) => Promise<void>;
  isSaving: boolean;
}

export function ProfilePictureEditor({
  image,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: ProfilePictureEditorProps) {
  const { t } = useTranslation('user-detail-management');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      if (croppedImage) {
        await onSave(croppedImage);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white/90 dark:bg-[#180F22] backdrop-blur-3xl border-white/20 p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            {t('profilePictureEditor.title', { defaultValue: 'Profil Resmini Düzenle' })}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[400px] mt-6 bg-slate-900/10 dark:bg-black/20">
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              cropShape="round"
              showGrid={false}
            />
          )}
        </div>

        <div className="p-6 space-y-8">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ZoomIn size={14} className="text-pink-500" />
                  {t('profilePictureEditor.zoom', { defaultValue: 'YAKINLAŞTIR' })}
                </span>
                <span className="text-xs font-bold text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded-lg">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-white/20 appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg 
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pink-500 
                    [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pink-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <RotateCw size={14} className="text-orange-500" />
                  {t('profilePictureEditor.rotate', { defaultValue: 'DÖNDÜR' })}
                </span>
                <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg">
                  {rotation}°
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  aria-labelledby="Rotation"
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-white/20 appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg 
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-orange-500 
                    [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-orange-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-2xl font-bold border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {t('common:cancel', { defaultValue: 'İptal' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-2xl font-black bg-linear-to-r from-pink-600 to-orange-600 hover:opacity-90 transition-all shadow-lg shadow-pink-500/20 text-white border-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:saving', { defaultValue: 'Kaydediliyor...' })}
                </>
              ) : (
                t('common:save', { defaultValue: 'Kaydet' })
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
