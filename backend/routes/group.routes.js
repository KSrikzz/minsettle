import express from 'express';
import {
  createGroup,
  listUserGroups,
  getGroupDetails,
  updateGroup,
  deleteGroup,
  joinGroupByCode,
  addMemberByEmail,
  removeMember,
} from '../controllers/group.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember } from '../middleware/groupMember.js';
import expenseRoutes from './expense.routes.js';
import settlementRoutes from './settlement.routes.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', createGroup);
router.get('/', listUserGroups);
router.post('/join', joinGroupByCode);
router.get('/:groupId', requireMember, getGroupDetails);
router.patch('/:groupId', requireMember, updateGroup);
router.put('/:groupId', requireMember, updateGroup);
router.delete('/:groupId', requireMember, deleteGroup);
router.post('/:groupId/join', joinGroupByCode);
router.post('/:groupId/members', requireMember, addMemberByEmail);
router.delete('/:groupId/members/:userId', requireMember, removeMember);

router.use('/:groupId/expenses', expenseRoutes);
router.use('/:groupId', settlementRoutes);

export default router;
