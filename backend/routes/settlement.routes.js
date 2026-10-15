import express from 'express';
import {
  getBalances,
  suggestSettlements,
  confirmSettlement,
  listSettlements,
} from '../controllers/settlement.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember } from '../middleware/groupMember.js';

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireMember);

router.get('/balances', getBalances);
router.post('/settlements/suggest', suggestSettlements);
router.post('/settlements/confirm', confirmSettlement);
router.get('/settlements', listSettlements);

export default router;
