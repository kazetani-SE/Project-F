import { apiClient } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/common/api';
import type { CreateMemberRequest, MemberFields, MemberQuery, MemberResponse } from '../types/models/member';

export const memberService = {
    list: async (params: MemberQuery) =>
        (await apiClient.get<ApiResponse<PageResponse<MemberResponse>>>('/members', { params })).data.data,
    get: async (id: string) =>
        (await apiClient.get<ApiResponse<MemberResponse>>(`/members/${id}`)).data.data,
    create: async (payload: CreateMemberRequest) =>
        (await apiClient.post<ApiResponse<MemberResponse>>('/members', payload)).data.data,
    update: async (id: string, payload: MemberFields) =>
        (await apiClient.put<ApiResponse<MemberResponse>>(`/members/${id}`, payload)).data.data,
    updateStatus: async (id: string, isActive: boolean) =>
        (await apiClient.patch<ApiResponse<MemberResponse>>(`/members/${id}/status`, { isActive })).data.data,
};
