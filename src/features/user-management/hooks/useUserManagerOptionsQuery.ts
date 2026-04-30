import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user-api';

export interface UserManagerOption {
  value: number;
  label: string;
}

export function useUserManagerOptionsQuery() {
  return useQuery({
    queryKey: ['user-management', 'manager-options'],
    queryFn: async (): Promise<UserManagerOption[]> => {
      const response = await userApi.getList({
        pageNumber: 1,
        pageSize: 500,
        sortBy: 'Username',
        sortDirection: 'asc',
      });

      const users = response.data ?? [];
      return users.map((user) => ({
        value: user.id,
        label: user.fullName?.trim() ? `${user.fullName} (${user.username})` : user.username,
      }));
    },
    staleTime: 60_000,
  });
}
