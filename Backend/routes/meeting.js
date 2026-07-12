import express from 'express';
import { 
  createMeeting, 
  getMyMeetings, 
  getMeetingById, 
  updateMeetingStatus, 
  rescheduleMeeting, 
  deleteMeeting 
} from '../controllers/meetingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { 
  createMeetingValidator, 
  updateStatusValidator 
} from '../validators/meetingValidator.js';

const router = express.Router();

// Authenticated users only
router.use(protect);

router.post('/', createMeetingValidator, createMeeting);
router.get('/', getMyMeetings);
router.get('/:id', getMeetingById);
router.put('/:id/status', updateStatusValidator, updateMeetingStatus);
router.put('/:id/reschedule', rescheduleMeeting);
router.delete('/:id', deleteMeeting);

export default router;
