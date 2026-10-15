import mongoose from 'mongoose';
import crypto from 'crypto';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator(val) {
          return Array.isArray(val) && val.length >= 1;
        },
        message: 'A group must have at least one member',
      },
      required: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      trim: true,
      default() {
        return 'INV-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      },
    },
  },
  {
    timestamps: true,
  }
);

const Group = mongoose.model('Group', groupSchema);
export default Group;
