import { validationResult } from 'express-validator';
import Meeting from '../models/Meeting.js';
import { createNotification } from '../services/notificationService.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// Internal helper for checking overlaps (double booking prevention)
const checkMeetingConflicts = async (userId, startTime, endTime, excludeMeetingId = null) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const query = {
    $or: [
      { host: userId },
      { attendee: userId }
    ],
    status: { $in: ['pending', 'accepted'] },
    deletedAt: null,
    $and: [
      { startTime: { $lt: end } },
      { endTime: { $gt: start } }
    ]
  };

  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }

  const conflict = await Meeting.findOne(query);
  return !!conflict;
};

// @desc    Create a meeting request
// @route   POST /api/meetings
// @access  Private
export const createMeeting = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { title, description, startTime, endTime, attendee } = req.body;
  const hostId = req.user._id;

  // Confirm target attendee exists
  const attendeeUser = await User.findById(attendee);
  if (!attendeeUser) {
    return res.status(404).json({
      success: false,
      message: 'Target attendee user does not exist',
      data: null,
      errors: null
    });
  }

  // Check host schedules for overlapping bookings
  const hostConflict = await checkMeetingConflicts(hostId, startTime, endTime);
  if (hostConflict) {
    return res.status(409).json({
      success: false,
      message: 'Schedule conflict: You are already booked during this time range.',
      data: null,
      errors: null
    });
  }

  // Check attendee schedules for overlapping bookings
  const attendeeConflict = await checkMeetingConflicts(attendee, startTime, endTime);
  if (attendeeConflict) {
    return res.status(409).json({
      success: false,
      message: `Schedule conflict: ${attendeeUser.name} is already booked during this time range.`,
      data: null,
      errors: null
    });
  }

  const meetingLink = `https://meet.jit.si/nexus-room-${Math.random().toString(36).substring(2, 10)}`;

  const meeting = await Meeting.create({
    title,
    description,
    startTime,
    endTime,
    host: hostId,
    attendee,
    meetingLink
  });

  // Create notifications record
  await createNotification({
    recipient: attendee,
    sender: hostId,
    type: 'meeting_request',
    title: 'New Meeting Request',
    message: `${req.user.name} has requested a meeting: "${title}"`,
    metadata: { meetingId: meeting._id }
  });

  res.status(201).json({
    success: true,
    message: 'Meeting scheduled successfully',
    data: meeting,
    errors: null
  });
});

// @desc    Get all meetings for the logged-in user
// @route   GET /api/meetings
// @access  Private
export const getMyMeetings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find meetings where user is either host or attendee
  const meetings = await Meeting.find({
    $or: [{ host: userId }, { attendee: userId }],
    deletedAt: null
  })
  .populate('host', 'name email role avatarUrl')
  .populate('attendee', 'name email role avatarUrl')
  .sort({ startTime: 1 });

  res.status(200).json({
    success: true,
    message: 'Meetings loaded successfully',
    data: meetings,
    errors: null
  });
});

// @desc    Get a single meeting details
// @route   GET /api/meetings/:id
// @access  Private
export const getMeetingById = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('host', 'name email role avatarUrl')
    .populate('attendee', 'name email role avatarUrl');

  if (!meeting || meeting.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found',
      data: null,
      errors: null
    });
  }

  // Authorize check: only host and attendee can view
  const userId = req.user._id.toString();
  if (meeting.host._id.toString() !== userId && meeting.attendee._id.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this meeting detail',
      data: null,
      errors: null
    });
  }

  res.status(200).json({
    success: true,
    message: 'Meeting retrieved successfully',
    data: meeting,
    errors: null
  });
});

// @desc    Update meeting status (Accept / Reject / Cancel)
// @route   PUT /api/meetings/:id/status
// @access  Private
export const updateMeetingStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { status } = req.body;
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting || meeting.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found',
      data: null,
      errors: null
    });
  }

  const userId = req.user._id.toString();
  if (meeting.host.toString() !== userId && meeting.attendee.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to edit this meeting status',
      data: null,
      errors: null
    });
  }

  meeting.status = status;
  await meeting.save();

  // Route notify logic
  const targetRecipient = meeting.host.toString() === userId ? meeting.attendee : meeting.host;
  let type = 'meeting_rejected';
  let title = 'Meeting Status Updated';
  if (status === 'accepted') {
    type = 'meeting_accepted';
    title = 'Meeting Accepted';
  }

  await createNotification({
    recipient: targetRecipient,
    sender: req.user._id,
    type,
    title,
    message: `${req.user.name} has ${status} the meeting: "${meeting.title}"`,
    metadata: { meetingId: meeting._id }
  });

  res.status(200).json({
    success: true,
    message: `Meeting has been ${status} successfully`,
    data: meeting,
    errors: null
  });
});

// @desc    Reschedule meeting
// @route   PUT /api/meetings/:id/reschedule
// @access  Private
export const rescheduleMeeting = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'Start time and end time are required to reschedule',
      data: null,
      errors: null
    });
  }

  const meeting = await Meeting.findById(req.params.id);

  if (!meeting || meeting.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found',
      data: null,
      errors: null
    });
  }

  const userId = req.user._id.toString();
  if (meeting.host.toString() !== userId && meeting.attendee.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to reschedule this meeting',
      data: null,
      errors: null
    });
  }

  // Conflict detection for host and attendee on new times
  const hostConflict = await checkMeetingConflicts(meeting.host, startTime, endTime, meeting._id);
  if (hostConflict) {
    return res.status(409).json({
      success: false,
      message: 'Schedule conflict: Host is busy during the requested time slot.',
      data: null,
      errors: null
    });
  }

  const attendeeConflict = await checkMeetingConflicts(meeting.attendee, startTime, endTime, meeting._id);
  if (attendeeConflict) {
    return res.status(409).json({
      success: false,
      message: 'Schedule conflict: Attendee is busy during the requested time slot.',
      data: null,
      errors: null
    });
  }

  meeting.startTime = startTime;
  meeting.endTime = endTime;
  meeting.status = 'pending'; // Revert back to pending verification
  await meeting.save();

  const targetRecipient = meeting.host.toString() === userId ? meeting.attendee : meeting.host;

  await createNotification({
    recipient: targetRecipient,
    sender: req.user._id,
    type: 'meeting_request',
    title: 'Meeting Rescheduled',
    message: `${req.user.name} has rescheduled the meeting: "${meeting.title}" to ${new Date(startTime).toLocaleString()}`,
    metadata: { meetingId: meeting._id }
  });

  res.status(200).json({
    success: true,
    message: 'Meeting has been rescheduled successfully and is pending confirmation',
    data: meeting,
    errors: null
  });
});

// @desc    Soft delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
export const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found',
      data: null,
      errors: null
    });
  }

  const userId = req.user._id.toString();
  if (meeting.host.toString() !== userId && meeting.attendee.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this meeting',
      data: null,
      errors: null
    });
  }

  meeting.deletedAt = new Date();
  await meeting.save();

  res.status(200).json({
    success: true,
    message: 'Meeting deleted successfully',
    data: null,
    errors: null
  });
});
