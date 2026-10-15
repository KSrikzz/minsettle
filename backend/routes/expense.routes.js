import express from 'express';
import {
  addExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember } from '../middleware/groupMember.js';

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireMember);

router.post('/', addExpense);
router.get('/', listExpenses);
router.put('/:expenseId', updateExpense);
router.patch('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);

export default router;
