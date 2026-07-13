import Deal from '../models/Deal.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validationResult } from 'express-validator';

// @desc    Create a new deal
// @route   POST /api/deals
// @access  Private (investor)
export const createDeal = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', data: null, errors: errors.array() });
  }

  const { entrepreneurId, startupName, industry, amount, equity, status, stage, notes } = req.body;
  const investorId = req.user._id;

  // Verify entrepreneur exists
  const entrepreneur = await User.findById(entrepreneurId);
  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return res.status(404).json({ success: false, message: 'Entrepreneur not found', data: null, errors: null });
  }

  const deal = await Deal.create({
    investor: investorId,
    entrepreneur: entrepreneurId,
    startupName,
    industry: industry || '',
    amount,
    equity: equity || '',
    status: status || 'exploring',
    stage: stage || 'seed',
    notes: notes || ''
  });

  const populated = await Deal.findById(deal._id)
    .populate('investor', 'name avatarUrl email')
    .populate('entrepreneur', 'name avatarUrl email');

  // Notify entrepreneur
  await createNotification({
    recipient: entrepreneurId,
    sender: investorId,
    type: 'payment_update',
    title: 'New Investment Deal',
    message: `${req.user.name} has initiated a deal for ${startupName}. Amount: $${amount.toLocaleString()}`,
    metadata: { dealId: deal._id }
  });

  res.status(201).json({ success: true, message: 'Deal created successfully', data: populated, errors: null });
});

// @desc    Get all deals for logged-in user (investor sees their deals, entrepreneur sees deals targeting them)
// @route   GET /api/deals
// @access  Private
export const getDeals = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  let filter = { deletedAt: null };
  if (userRole === 'investor') {
    filter.investor = userId;
  } else if (userRole === 'entrepreneur') {
    filter.entrepreneur = userId;
  } else {
    // Admin sees all
  }

  const deals = await Deal.find(filter)
    .populate('investor', 'name avatarUrl email')
    .populate('entrepreneur', 'name avatarUrl email')
    .sort({ createdAt: -1 });

  // Compute stats
  const totalAmount = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const activeDeals = deals.filter(d => !['closed', 'passed'].includes(d.status)).length;
  const closedDeals = deals.filter(d => d.status === 'closed').length;
  const uniqueEntrepreneurs = new Set(deals.map(d => d.entrepreneur?._id?.toString())).size;

  res.status(200).json({
    success: true,
    message: 'Deals loaded successfully',
    data: {
      deals,
      stats: {
        totalAmount,
        totalDeals: deals.length,
        activeDeals,
        closedDeals,
        portfolioCount: uniqueEntrepreneurs
      }
    },
    errors: null
  });
});

// @desc    Get a single deal
// @route   GET /api/deals/:id
// @access  Private
export const getDealById = asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id)
    .populate('investor', 'name avatarUrl email')
    .populate('entrepreneur', 'name avatarUrl email');

  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal not found', data: null, errors: null });
  }

  const userId = req.user._id.toString();
  if (deal.investor._id.toString() !== userId && deal.entrepreneur._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized', data: null, errors: null });
  }

  res.status(200).json({ success: true, message: 'Deal retrieved', data: deal, errors: null });
});

// @desc    Update deal status or notes
// @route   PUT /api/deals/:id
// @access  Private
export const updateDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id);
  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal not found', data: null, errors: null });
  }

  const userId = req.user._id.toString();
  if (deal.investor.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to update this deal', data: null, errors: null });
  }

  const { status, notes, equity, amount, stage } = req.body;
  if (status) deal.status = status;
  if (notes !== undefined) deal.notes = notes;
  if (equity !== undefined) deal.equity = equity;
  if (amount !== undefined) deal.amount = amount;
  if (stage !== undefined) deal.stage = stage;

  await deal.save();

  const populated = await Deal.findById(deal._id)
    .populate('investor', 'name avatarUrl email')
    .populate('entrepreneur', 'name avatarUrl email');

  // Notify entrepreneur about status change
  if (status) {
    await createNotification({
      recipient: deal.entrepreneur,
      sender: req.user._id,
      type: 'payment_update',
      title: 'Deal Status Updated',
      message: `${req.user.name} updated the deal status to "${status.replace(/_/g, ' ')}" for ${deal.startupName}`,
      metadata: { dealId: deal._id }
    });
  }

  res.status(200).json({ success: true, message: 'Deal updated successfully', data: populated, errors: null });
});

// @desc    Soft delete a deal
// @route   DELETE /api/deals/:id
// @access  Private (investor or admin)
export const deleteDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id);
  if (!deal) {
    return res.status(404).json({ success: false, message: 'Deal not found', data: null, errors: null });
  }

  const userId = req.user._id.toString();
  if (deal.investor.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized', data: null, errors: null });
  }

  deal.deletedAt = new Date();
  await deal.save();

  res.status(200).json({ success: true, message: 'Deal deleted successfully', data: null, errors: null });
});

// @desc    Get all entrepreneurs for deal creation (for investor dropdown)
// @route   GET /api/deals/entrepreneurs
// @access  Private
export const getEntrepreneurs = asyncHandler(async (req, res) => {
  const entrepreneurs = await User.find({ role: 'entrepreneur', deletedAt: null })
    .select('name email avatarUrl _id');

  res.status(200).json({ success: true, message: 'Entrepreneurs loaded', data: entrepreneurs, errors: null });
});
