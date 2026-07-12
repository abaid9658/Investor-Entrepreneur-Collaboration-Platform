import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { X, Plus, Calendar, Clock, User, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import {
  getMyMeetings,
  createMeeting,
  updateMeetingStatus,
  deleteMeeting,
} from '../../api/services/meetingService';
import { getProfiles } from '../../api/services/profileService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
  rescheduled: '#8b5cf6',
};

export const MeetingCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendee: '',
  });
  const calendarRef = useRef<FullCalendar>(null);

  const { data: meetingsData } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMyMeetings,
  });

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => getProfiles(''),
  });

  const meetings = meetingsData?.data || [];
  const profiles = profilesData?.data || [];

  const calendarEvents = meetings.map((m: any) => ({
    id: m._id,
    title: m.title,
    start: m.startTime,
    end: m.endTime,
    backgroundColor: STATUS_COLORS[m.status] || '#8b5cf6',
    borderColor: 'transparent',
    extendedProps: m,
  }));

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      toast.success('Meeting scheduled!');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setShowModal(false);
      setForm({ title: '', description: '', startTime: '', endTime: '', attendee: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to schedule meeting'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateMeetingStatus(id, status),
    onSuccess: () => {
      toast.success('Meeting updated!');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedMeeting(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      toast.success('Meeting deleted');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSelectedMeeting(null);
    },
  });

  const handleDateSelect = (selectInfo: any) => {
    setForm(f => ({
      ...f,
      startTime: selectInfo.startStr.slice(0, 16),
      endTime: selectInfo.endStr.slice(0, 16),
    }));
    setShowModal(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedMeeting(clickInfo.event.extendedProps);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.attendee) { toast.error('Please select an attendee'); return; }
    createMutation.mutate(form);
  };

  const otherProfiles = profiles.filter((p: any) => p.user?._id !== user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and manage your meetings</p>
        </div>
        <button
          id="schedule-meeting-btn"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-md shadow-purple-200"
        >
          <Plus size={18} /> Schedule Meeting
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-sm text-gray-600 capitalize">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {status}
          </span>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          selectable
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </div>

      {/* Create Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Schedule Meeting</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Meeting title"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Meeting agenda..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendee *</label>
                <select
                  value={form.attendee}
                  onChange={e => setForm(f => ({ ...f, attendee: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                >
                  <option value="">Select attendee</option>
                  {otherProfiles.map((p: any) => (
                    <option key={p.user?._id} value={p.user?._id}>
                      {p.user?.name} ({p.user?.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-schedule-btn"
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Meeting Details</h2>
              <button onClick={() => setSelectedMeeting(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{selectedMeeting.title}</h3>
                {selectedMeeting.description && (
                  <p className="text-gray-500 text-sm mt-1">{selectedMeeting.description}</p>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} className="text-purple-500" />
                  <span>{new Date(selectedMeeting.startTime).toLocaleString()} → {new Date(selectedMeeting.endTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User size={16} className="text-purple-500" />
                  <span>Host: {selectedMeeting.host?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User size={16} className="text-purple-500" />
                  <span>Attendee: {selectedMeeting.attendee?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                    style={{ backgroundColor: STATUS_COLORS[selectedMeeting.status] + '20', color: STATUS_COLORS[selectedMeeting.status] }}
                  >
                    {selectedMeeting.status}
                  </span>
                </div>
                {selectedMeeting.meetingLink && (
                  <a
                    href={selectedMeeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
                  >
                    <Calendar size={16} /> Join Meeting Room
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              {selectedMeeting.status === 'pending' && selectedMeeting.attendee?._id === user?.id && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => statusMutation.mutate({ id: selectedMeeting._id, status: 'accepted' })}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl transition-colors text-sm font-medium"
                  >
                    <CheckCircle size={16} /> Accept
                  </button>
                  <button
                    onClick={() => statusMutation.mutate({ id: selectedMeeting._id, status: 'rejected' })}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl transition-colors text-sm font-medium"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
              {(selectedMeeting.status === 'pending' || selectedMeeting.status === 'accepted') && selectedMeeting.host?._id === user?.id && (
                <button
                  onClick={() => deleteMutation.mutate(selectedMeeting._id)}
                  className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl transition-colors text-sm font-medium"
                >
                  <RotateCcw size={16} /> Cancel Meeting
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
