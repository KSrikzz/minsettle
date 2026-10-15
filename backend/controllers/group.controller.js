import mongoose from 'mongoose';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

export async function createGroup(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user._id,
      members: [req.user._id],
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    return res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create group',
      error: error.message,
    });
  }
}

export async function listUserGroups(req, res) {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve groups',
      error: error.message,
    });
  }
}

export async function getGroupDetails(req, res) {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    return res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve group details',
      error: error.message,
    });
  }
}

export async function updateGroup(req, res) {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const creatorId = (group.createdBy._id || group.createdBy).toString();
    if (creatorId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the group creator can edit this group',
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Group name cannot be empty',
        });
      }
      group.name = name.trim();
    }

    if (description !== undefined) {
      group.description = description.trim();
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    return res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update group',
      error: error.message,
    });
  }
}

export async function deleteGroup(req, res) {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const creatorId = (group.createdBy._id || group.createdBy).toString();
    if (creatorId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the group creator can delete this group',
      });
    }

    const targetGroupId = new mongoose.Types.ObjectId(groupId);
    await Settlement.collection.deleteMany({ group: targetGroupId });
    await Expense.collection.deleteMany({ group: targetGroupId });
    await Group.findByIdAndDelete(groupId);

    return res.status(200).json({
      success: true,
      message: 'Group and all associated records deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete group',
      error: error.message,
    });
  }
}

export async function joinGroupByCode(req, res) {
  try {
    const { groupId } = req.params;
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required',
      });
    }

    const cleanedCode = inviteCode.trim().toUpperCase();
    let group;

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      group = await Group.findById(groupId);
    } else {
      group = await Group.findOne({
        $or: [
          { inviteCode: cleanedCode },
          { inviteCode: cleanedCode.replace(/^INV-/, '') },
          { inviteCode: 'INV-' + cleanedCode.replace(/^INV-/, '') },
        ],
      });
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found with this invite code',
      });
    }

    const groupInviteCode = (group.inviteCode || '').toUpperCase();
    const matchesCode =
      groupInviteCode === cleanedCode ||
      groupInviteCode === cleanedCode.replace(/^INV-/, '') ||
      ('INV-' + groupInviteCode.replace(/^INV-/, '')) === cleanedCode;

    if (!matchesCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invite code',
      });
    }

    const userIdStr = req.user._id.toString();
    const alreadyMember = group.members.some((m) => m.toString() === userIdStr);

    if (alreadyMember) {
      const populatedGroup = await Group.findById(group._id)
        .populate('createdBy', 'name email upiId')
        .populate('members', 'name email upiId');

      return res.status(200).json({
        success: true,
        message: 'You are already a member of this group',
        group: populatedGroup,
      });
    }

    group.members.push(req.user._id);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    return res.status(200).json({
      success: true,
      message: 'Successfully joined group',
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to join group',
      error: error.message,
    });
  }
}

export async function addMemberByEmail(req, res) {
  try {
    const { email } = req.body;
    const group = req.group;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'User email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userToAdd = await User.findOne({ email: normalizedEmail });

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with this email',
      });
    }

    const userToAddIdStr = userToAdd._id.toString();
    const alreadyMember = group.members.some((m) => m.toString() === userToAddIdStr);

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group',
      });
    }

    group.members.push(userToAdd._id);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    return res.status(200).json({
      success: true,
      message: 'Member added successfully',
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add member by email',
      error: error.message,
    });
  }
}

export async function removeMember(req, res) {
  try {
    const { groupId, userId } = req.params;
    const group = req.group;

    const creatorIdStr = (group.createdBy._id || group.createdBy).toString();
    if (creatorIdStr !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can remove members',
      });
    }

    if (userId.toString() === creatorIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Group creator cannot be removed from the group',
      });
    }

    const memberIndex = group.members.findIndex((m) => m.toString() === userId.toString());
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group',
      });
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email upiId')
      .populate('members', 'name email upiId');

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      group: populatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message,
    });
  }
}
