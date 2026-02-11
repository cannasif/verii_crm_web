import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { UpdateDemandNotesListDto } from '../types/demand-types';

export const useUpdateDemandNotesList = (demandId: number): UseMutationResult<ApiResponse<unknown>, Error, UpdateDemandNotesListDto, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDemandNotesListDto) =>
      demandApi.updateNotesListByDemandId(demandId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demandNotes(demandId) });
    },
  });
};
