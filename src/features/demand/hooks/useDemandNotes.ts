import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandNotesGetDto } from '../types/demand-types';

export const useDemandNotes = (demandId: number): UseQueryResult<DemandNotesGetDto | null, Error> => {
  return useQuery({
    queryKey: queryKeys.demandNotes(demandId),
    queryFn: () => demandApi.getDemandNotesByDemandId(demandId),
    enabled: !!demandId && demandId > 0,
    staleTime: 2 * 60 * 1000,
  });
};
