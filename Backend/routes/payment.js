import express from 'express';
import { 
  getPaymentDashboard, 
  depositFunds, 
  confirmDeposit, 
  transferFunds, 
  withdrawFunds,
  getBalance,
  getLedger,
  createPaymentIntent,
  confirmPaymentIntent,
  getTransactionById
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { 
  depositValidator, 
  transferValidator, 
  withdrawValidator 
} from '../validators/paymentValidator.js';

const router = express.Router();

router.use(protect);

// Legacy dashboard
router.get('/dashboard', getPaymentDashboard);

// New balance & ledger
router.get('/balance', getBalance);
router.get('/ledger', getLedger);

// Stripe-style payment intent (sandbox)
router.post('/intent', createPaymentIntent);
router.post('/confirm', confirmPaymentIntent);

// Transaction detail
router.get('/transaction/:id', getTransactionById);

// Legacy payment actions
router.post('/deposit', depositValidator, depositFunds);
router.post('/confirm-deposit', confirmDeposit);
router.post('/transfer', transferValidator, transferFunds);
router.post('/withdraw', withdrawValidator, withdrawFunds);

export default router;
