import express from 'express';
import {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  getEntrepreneurs
} from '../controllers/dealController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/entrepreneurs', getEntrepreneurs);
router.get('/', getDeals);
router.post('/', createDeal);
router.get('/:id', getDealById);
router.put('/:id', updateDeal);
router.delete('/:id', deleteDeal);

export default router;
