import { validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import { createNotification } from '../services/notificationService.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

// Calculate user balance by aggregating all completed transactions
const calculateUserBalance = async (userId) => {
  const transactions = await Transaction.find({
    $or: [
      { user: userId },
      { recipient: userId }
    ],
    status: 'completed',
    deletedAt: null
  });

  let balance = 0;
  for (const tx of transactions) {
    if (tx.type === 'deposit') {
      balance += tx.amount;
    } else if (tx.type === 'withdraw') {
      balance -= tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.user.toString() === userId.toString()) {
        // Logged-in user is sender, money left
        balance -= tx.amount;
      } else {
        // Logged-in user is recipient, money arrived
        balance += tx.amount;
      }
    }
  }
  return balance;
};

// @desc    Get user's ledger balance & transaction history
// @route   GET /api/payments/dashboard
// @access  Private
export const getPaymentDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const balance = await calculateUserBalance(userId);
  
  const history = await Transaction.find({
    $or: [
      { user: userId },
      { recipient: userId }
    ],
    deletedAt: null
  })
  .populate('user', 'name email avatarUrl')
  .populate('recipient', 'name email avatarUrl')
  .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Payment ledger loaded successfully',
    data: {
      balance,
      transactions: history
    },
    errors: null
  });
});

// @desc    Initiate Stripe deposit checkout
// @route   POST /api/payments/deposit
// @access  Private
export const depositFunds = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { amount } = req.body;
  const userId = req.user._id;

  // Simulate Stripe Payment Intent creation for testing and local sandbox runs
  const isMockStripe = 
    !process.env.STRIPE_SECRET_KEY || 
    process.env.STRIPE_SECRET_KEY === 'sk_test_mock_stripe' ||
    process.env.STRIPE_SECRET_KEY.includes('<');

  let clientSecret = `mock_sec_intent_${Math.random().toString(36).substring(2, 12)}`;

  // Create pending transaction in Ledger
  const tx = await Transaction.create({
    user: userId,
    type: 'deposit',
    amount,
    status: 'pending',
    stripePaymentIntentId: isMockStripe ? `pi_mock_${Date.now()}` : 'intent_pending',
    description: 'Deposit via Stripe Gateway'
  });

  res.status(201).json({
    success: true,
    message: 'Stripe deposit intent initialized',
    data: {
      transactionId: tx._id,
      clientSecret,
      amount,
      isMock: isMockStripe
    },
    errors: null
  });
});

// @desc    Simulate or handle Stripe Webhook successful deposits
// @route   POST /api/payments/confirm-deposit
// @access  Private
export const confirmDeposit = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  const tx = await Transaction.findById(transactionId);
  if (!tx || tx.deletedAt) {
    return res.status(404).json({
      success: false,
      message: 'Transaction ledger record not found',
      data: null,
      errors: null
    });
  }

  if (tx.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Transaction has already been completed',
      data: null,
      errors: null
    });
  }

  // Set pending transaction to Completed
  tx.status = 'completed';
  await tx.save();

  // Trigger Notification alert
  await createNotification({
    recipient: tx.user,
    type: 'payment_update',
    title: 'Deposit Succeeded',
    message: `A deposit of $${tx.amount.toFixed(2)} was successfully processed to your wallet.`,
    metadata: { transactionId: tx._id }
  });

  res.status(200).json({
    success: true,
    message: 'Deposit confirmed and wallet balance updated successfully',
    data: tx,
    errors: null
  });
});

// @desc    Transfer funds from one account to another (e.g. Investor to Entrepreneur)
// @route   POST /api/payments/transfer
// @access  Private
export const transferFunds = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { amount, recipientId, description } = req.body;
  const senderId = req.user._id;

  if (senderId.toString() === recipientId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot transfer funds to yourself',
      data: null,
      errors: null
    });
  }

  // Validate recipient exists
  const recipientUser = await User.findById(recipientId);
  if (!recipientUser) {
    return res.status(404).json({
      success: false,
      message: 'Recipient account does not exist',
      data: null,
      errors: null
    });
  }

  // Double-entry validation: check sender has enough funds
  const balance = await calculateUserBalance(senderId);
  if (balance < amount) {
    return res.status(422).json({
      success: false,
      message: `Insufficient funds. Your current wallet balance is $${balance.toFixed(2)}.`,
      data: null,
      errors: null
    });
  }

  // Write completed transfer
  const tx = await Transaction.create({
    user: senderId,
    type: 'transfer',
    amount,
    recipient: recipientId,
    status: 'completed',
    description: description || `Transfer to ${recipientUser.name}`
  });

  // Notify recipient
  await createNotification({
    recipient: recipientId,
    sender: senderId,
    type: 'payment_update',
    title: 'Payment Received',
    message: `You received a transfer of $${amount.toFixed(2)} from ${req.user.name}.`,
    metadata: { transactionId: tx._id }
  });

  // Notify sender
  await createNotification({
    recipient: senderId,
    sender: senderId,
    type: 'payment_update',
    title: 'Transfer Sent',
    message: `You successfully transferred $${amount.toFixed(2)} to ${recipientUser.name}.`,
    metadata: { transactionId: tx._id }
  });

  res.status(200).json({
    success: true,
    message: 'Transfer completed successfully',
    data: tx,
    errors: null
  });
});

// @desc    Initiate ledger withdrawal
// @route   POST /api/payments/withdraw
// @access  Private
export const withdrawFunds = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: null,
      errors: errors.array()
    });
  }

  const { amount } = req.body;
  const userId = req.user._id;

  // Confirm user has enough funds
  const balance = await calculateUserBalance(userId);
  if (balance < amount) {
    return res.status(422).json({
      success: false,
      message: `Insufficient funds. Your current wallet balance is $${balance.toFixed(2)}.`,
      data: null,
      errors: null
    });
  }

  // Write withdrawal
  const tx = await Transaction.create({
    user: userId,
    type: 'withdraw',
    amount,
    status: 'completed',
    description: 'Withdrawal to registered bank account'
  });

  await createNotification({
    recipient: userId,
    type: 'payment_update',
    title: 'Withdrawal Completed',
    message: `A withdrawal of $${amount.toFixed(2)} was successfully sent to your bank.`,
    metadata: { transactionId: tx._id }
  });

  res.status(200).json({
    success: true,
    message: 'Withdrawal processed successfully',
    data: tx,
    errors: null
  });
});

// @desc    Get user's available/pending/total balance summary
// @route   GET /api/payments/balance
// @access  Private
export const getBalance = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const allTx = await Transaction.find({
    $or: [{ user: userId }, { recipient: userId }],
    deletedAt: null
  });

  let availableBalance = 0;
  let pendingBalance = 0;
  let totalInvested = 0;
  let totalReceived = 0;

  for (const tx of allTx) {
    const isCredit = tx.recipient?.toString() === userId.toString() || 
                     (tx.type === 'deposit' && tx.user.toString() === userId.toString());
    const isDebit = !isCredit;

    if (tx.status === 'completed') {
      if (isCredit) { availableBalance += tx.amount; totalReceived += tx.amount; }
      else { availableBalance -= tx.amount; totalInvested += tx.amount; }
    } else if (tx.status === 'pending') {
      if (isCredit) pendingBalance += tx.amount;
    }
  }

  res.status(200).json({
    success: true,
    message: 'Balance loaded',
    data: { availableBalance, pendingBalance, totalInvested, totalReceived },
    errors: null
  });
});

// @desc    Get full ledger transaction history
// @route   GET /api/payments/ledger
// @access  Private
export const getLedger = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const transactions = await Transaction.find({
    $or: [{ user: userId }, { recipient: userId }],
    deletedAt: null
  })
  .populate('user', 'name email avatarUrl')
  .populate('recipient', 'name email avatarUrl')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);

  res.status(200).json({
    success: true,
    message: 'Ledger loaded',
    data: transactions,
    errors: null
  });
});

// @desc    Create Stripe-style payment intent (sandbox)
// @route   POST /api/payments/intent
// @access  Private
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount, currency = 'usd', recipientId, description, type = 'investment' } = req.body;
  const userId = req.user._id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be positive', data: null, errors: null });
  }

  const clientSecret = `mock_pi_${Date.now()}_secret_${Math.random().toString(36).slice(2, 10)}`;

  const tx = await Transaction.create({
    user: userId,
    type,
    amount,
    currency,
    recipient: recipientId || null,
    status: 'pending',
    stripePaymentIntentId: `pi_mock_${Date.now()}`,
    description: description || `${type} payment`,
    transactionRef: `NX-${Date.now().toString(36).toUpperCase()}`
  });

  res.status(201).json({
    success: true,
    message: 'Payment intent created',
    data: { clientSecret, transactionId: tx._id, isMock: true },
    errors: null
  });
});

// @desc    Confirm a payment intent (sandbox — auto-succeeds)
// @route   POST /api/payments/confirm
// @access  Private
export const confirmPaymentIntent = asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  const tx = await Transaction.findById(transactionId);
  if (!tx) {
    return res.status(404).json({ success: false, message: 'Transaction not found', data: null, errors: null });
  }
  if (tx.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Already completed', data: null, errors: null });
  }

  tx.status = 'completed';
  await tx.save();

  // Notify both parties
  await createNotification({
    recipient: tx.user,
    type: 'payment_update',
    title: 'Payment Confirmed',
    message: `Your ${tx.type} of $${tx.amount.toFixed(2)} has been confirmed.`,
    metadata: { transactionId: tx._id }
  });

  if (tx.recipient) {
    await createNotification({
      recipient: tx.recipient,
      sender: tx.user,
      type: 'payment_update',
      title: 'Payment Received',
      message: `You received a ${tx.type} of $${tx.amount.toFixed(2)}.`,
      metadata: { transactionId: tx._id }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment confirmed successfully',
    data: tx,
    errors: null
  });
});

// @desc    Get single transaction by ID
// @route   GET /api/payments/transaction/:id
// @access  Private
export const getTransactionById = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({
    _id: req.params.id,
    $or: [{ user: req.user._id }, { recipient: req.user._id }],
    deletedAt: null
  })
  .populate('user', 'name email avatarUrl')
  .populate('recipient', 'name email avatarUrl');

  if (!tx) {
    return res.status(404).json({ success: false, message: 'Transaction not found', data: null, errors: null });
  }

  res.status(200).json({ success: true, message: 'Transaction loaded', data: tx, errors: null });
});
