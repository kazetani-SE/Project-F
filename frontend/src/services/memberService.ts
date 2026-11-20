import { apiClient } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/common/api';
import type { CreateMemberRequest, MemberFields, MemberImportReport, MemberQuery, MemberResponse } from '../types/models/member';

export const memberService = {
    template: async () => (await apiClient.get<Blob>('/members/import/template', { responseType: 'blob' })).data,
    importFile: async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        return (await apiClient.post<ApiResponse<MemberImportReport>>('/members/import', form)).data.data;
    },
    resendCredentials: async (id: string) => {
        await apiClient.post(`/members/${id}/credentials/resend`);
    },
    provisionCredentials: async (id: string) =>
        (await apiClient.post<ApiResponse<'CREATED' | 'AUTH_EXISTS' | 'EMAIL_FAILED'>>(`/members/${id}/credentials/provision`)).data.data,
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
