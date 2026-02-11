export const activityImageKeys = {
  all: ['activity-images'] as const,
  byActivity: (activityId: number) => [...activityImageKeys.all, 'by-activity', activityId] as const,
};
