import { activityImageApi } from '@/features/activity-image-management/api/activity-image-api';

export async function persistActivityFormImages(
  activityId: number,
  options: {
    pendingImages?: { file: File; description: string }[];
    pendingDeletedImageIds?: number[];
    pendingUpdatedImageDescriptions?: Record<number, string>;
  } = {}
): Promise<void> {
  const { pendingImages, pendingDeletedImageIds, pendingUpdatedImageDescriptions } = options;
  const promises: Promise<unknown>[] = [];

  if (pendingDeletedImageIds?.length) {
    pendingDeletedImageIds.forEach((imageId) => {
      promises.push(activityImageApi.delete(imageId));
    });
  }

  if (pendingUpdatedImageDescriptions && Object.keys(pendingUpdatedImageDescriptions).length > 0) {
    const currentImages = await activityImageApi.getByActivityId(activityId);
    Object.entries(pendingUpdatedImageDescriptions).forEach(([idStr, description]) => {
      const imageId = Number(idStr);
      const currentImage = currentImages.find((img) => img.id === imageId);
      if (currentImage) {
        promises.push(
          activityImageApi.update(imageId, {
            activityId,
            resimAciklama: description,
            resimUrl: currentImage.resimUrl,
          })
        );
      }
    });
  }

  if (pendingImages?.length) {
    const files = pendingImages.map((img) => img.file);
    const descriptions = pendingImages.map((img) => img.description);
    promises.push(
      activityImageApi.upload(activityId, {
        files,
        resimAciklamalar: descriptions.some((d) => d) ? descriptions : undefined,
      })
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
