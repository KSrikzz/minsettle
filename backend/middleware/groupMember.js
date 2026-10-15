import mongoose from 'mongoose';
import Group from '../models/Group.js';

export async function requireMember(req, res, next) {
  try {
    const { groupId } = req.params;

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const userIdStr = req.user._id.toString();
    const isMember = group.members.some(
      (memberId) => memberId.toString() === userIdStr
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this group',
      });
    }

    req.group = group;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify group membership',
      error: error.message,
    });
  }
}
