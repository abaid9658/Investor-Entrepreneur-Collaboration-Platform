import express from 'express';
import { 
  getMyProfile, 
  getProfiles,
  updateMyProfile, 
  getProfileById, 
  uploadAvatar 
} from '../controllers/profileController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

// Secure all endpoints in this routing file
router.use(protect);

router.get('/me', getMyProfile);
router.get('/', getProfiles);
router.put('/me', updateMyProfile);
router.get('/:userId', getProfileById);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
