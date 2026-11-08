// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../src/context/authContext';
import { ActiveEventProvider } from '../../src/context/ActiveEventProvider';
import EventAccess from '../../src/components/layout/EventAccess';
import { MemberDetailPage, MembersPage } from '../../src/pages/members/MemberPages';
import { EventStatusForm } from '../../src/pages/events/EventStatusForm';
import { OrganizerSection } from '../../src/pages/events/OrganizerSection';
import { SeriesDetailPage } from '../../src/pages/events/SeriesPages';
import { memberService } from '../../src/services/memberService';
import { eventService, seriesService } from '../../src/services/eventService';
import type { EventResponse } from '../../src/types/models/event';
import type { ClubRole } from '../../src/types/models/auth';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

const auth = (clubRole: ClubRole) => ({
    user: { id: 'member', fullName: 'Test Member', email: 'member@example.com', clubRole },
    isLoading: false, error: null, recovery: false,
    signIn: vi.fn(), signOut: vi.fn(), sendReset: vi.fn(), updatePassword: vi.fn(), retry: vi.fn(),
});

it('applies filters and exposes only read actions for members', async () => {
    const list = vi.spyOn(memberService, 'list').mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    render(<AuthContext value={auth('MEMBER')}><MemoryRouter><MembersPage /></MemoryRouter></AuthContext>);
    const input = userEvent.setup();
    expect(await screen.findByText('Không tìm thấy thành viên.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Thêm thành viên' })).toBeNull();
    await input.type(screen.getByLabelText('Từ khóa'), 'An');
    await input.selectOptions(screen.getByLabelText('Trạng thái'), 'false');
    await input.click(screen.getByRole('button', { name: 'Lọc danh sách' }));
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'An', isActive: false, page: 0 }));
});

it('refreshes the signed-in profile after changing its membership status', async () => {
    const admin = auth('PRESIDENT');
    const member = { ...admin.user, studentId: 'SE000001', phone: null, department: null, batch: 'K21',
        active: true, createdAt: '', inactiveAt: null };
    vi.spyOn(memberService, 'get').mockResolvedValue(member);
    const updateStatus = vi.spyOn(memberService, 'updateStatus').mockResolvedValue({ ...member, active: false });
    render(<AuthContext value={admin}><MemoryRouter initialEntries={['/members/member']}>
        <Routes><Route path="/members/:id" element={<MemberDetailPage />} /></Routes>
    </MemoryRouter></AuthContext>);
    await userEvent.click(await screen.findByRole('button', { name: 'Ngừng hoạt động' }));
    expect(updateStatus).toHaveBeenCalledWith('member', false);
    expect(admin.retry).toHaveBeenCalledOnce();
});

it('adds an organizer using the member ID and a documented role', async () => {
    vi.spyOn(memberService, 'list').mockResolvedValue({
        content: [{
            id: 'candidate', fullName: 'An', email: 'an@example.com', studentId: 'SE000001',
            clubRole: 'MEMBER', phone: null, department: 'PLAN', batch: 'K21',
            active: true, createdAt: '', inactiveAt: null,
        }],
        page: 0, size: 20, totalElements: 1, totalPages: 1,
    });
    vi.spyOn(eventService, 'organizers').mockResolvedValue([]);
    const assign = vi.spyOn(eventService, 'assign').mockResolvedValue({
        id: 'organizer', eventId: 'event-1', memberId: 'candidate', memberName: 'An',
        role: 'RISK_PLAN', assignedTasks: 'Chuẩn bị kế hoạch', joinedAt: '',
    });
    render(<OrganizerSection eventId="event-1" admin />);
    const input = userEvent.setup();
    await input.click(await screen.findByRole('button', { name: 'Thêm thành viên BTC' }));
    await input.selectOptions(await screen.findByLabelText('Thành viên'), 'candidate');
    await input.selectOptions(screen.getByLabelText('Vai trò BTC'), 'RISK_PLAN');
    await input.type(screen.getByLabelText('Nhiệm vụ được giao'), 'Chuẩn bị kế hoạch');
    await input.click(screen.getByRole('button', { name: 'Phân công' }));
    expect(assign).toHaveBeenCalledWith('event-1', {
        memberId: 'candidate', role: 'RISK_PLAN', assignedTasks: 'Chuẩn bị kế hoạch',
    });
});

const event: EventResponse = {
    id: 'event-1', title: 'Mùa xuân', seasonName: '2026', description: null, seriesId: 'series-1',
    status: 'PLANNING', expectedStartDate: '2026-10-10', expectedEndDate: '2026-10-11',
    actualStartDate: null, actualEndDate: null, allocatedFund: 0, createdAt: '', updatedAt: '',
};

it('includes both actual dates when completing a legacy event that lacks a start date', async () => {
    const current = { ...event, status: 'IN_PROGRESS' as const };
    const updateStatus = vi.spyOn(eventService, 'updateStatus').mockResolvedValue({ ...current, status: 'COMPLETED' });
    render(<EventStatusForm event={current} onSaved={vi.fn()} />);
    const input = userEvent.setup();
    await input.selectOptions(screen.getByLabelText('Trạng thái mới'), 'COMPLETED');
    await input.type(screen.getByLabelText('Ngày bắt đầu thực tế'), '2026-10-10');
    await input.type(screen.getByLabelText('Ngày kết thúc thực tế'), '2026-10-11');
    await input.click(screen.getByRole('button', { name: 'Cập nhật trạng thái' }));
    expect(updateStatus).toHaveBeenCalledWith('event-1', {
        status: 'COMPLETED', actualStartDate: '2026-10-10', actualEndDate: '2026-10-11',
    });
});

it('shows the events embedded in the series detail and hides editing for members', async () => {
    vi.spyOn(seriesService, 'get').mockResolvedValue({
        id: 'series-1', name: 'Chuỗi mẫu', description: null, createdAt: '', events: [event],
    });
    render(<AuthContext value={auth('MEMBER')}><MemoryRouter initialEntries={['/series/series-1']}>
        <Routes><Route path="/series/:id" element={<SeriesDetailPage />} /></Routes>
    </MemoryRouter></AuthContext>);
    expect((await screen.findByRole('link', { name: 'Mùa xuân' })).getAttribute('href')).toBe('/events/event-1/overview');
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).toBeNull();
});

it.each([
    ['VICEPRESIDENT', 'Event contents'],
    ['MEMBER', 'Forbidden route'],
] as const)('handles a null event role for a %s', async (clubRole, visibleText) => {
    vi.spyOn(eventService, 'get').mockResolvedValue(event);
    vi.spyOn(eventService, 'myRole').mockResolvedValue(null);
    render(<AuthContext value={auth(clubRole)}><MemoryRouter initialEntries={['/events/event-1/overview']}>
        <ActiveEventProvider><Routes>
            <Route path="/403" element={<p>Forbidden route</p>} />
            <Route path="/events/:eventId" element={<EventAccess />}>
                <Route path="overview" element={<p>Event contents</p>} />
            </Route>
        </Routes></ActiveEventProvider>
    </MemoryRouter></AuthContext>);
    expect(await screen.findByText(visibleText)).toBeTruthy();
});

it('sends the required actual start date when starting an approved event', async () => {
    const event = { id: 'event-1', status: 'APPROVED' } as EventResponse;
    const changed = { ...event, status: 'IN_PROGRESS' as const };
    const updateStatus = vi.spyOn(eventService, 'updateStatus').mockResolvedValue(changed);
    const onSaved = vi.fn();
    render(<EventStatusForm event={event} onSaved={onSaved} />);
    const input = userEvent.setup();
    await input.selectOptions(screen.getByLabelText('Trạng thái mới'), 'IN_PROGRESS');
    await input.type(screen.getByLabelText('Ngày bắt đầu thực tế'), '2026-10-10');
    await input.click(screen.getByRole('button', { name: 'Cập nhật trạng thái' }));
    expect(updateStatus).toHaveBeenCalledWith('event-1', { status: 'IN_PROGRESS', actualStartDate: '2026-10-10' });
    expect(onSaved).toHaveBeenCalledWith(changed);
});
