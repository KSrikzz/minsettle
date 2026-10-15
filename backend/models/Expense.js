import mongoose from 'mongoose';

const splitItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Split user is required'],
    },
    amountPaise: {
      type: Number,
      required: [true, 'Split amount in paise is required'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
      min: [0, 'Split amount in paise cannot be negative'],
    },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer (paidBy) is required'],
    },
    amountPaise: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      validate: {
        validator(val) {
          return Number.isInteger(val) && val > 0;
        },
        message: 'Amount must be a positive integer in paise',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: ['rent', 'wifi', 'groceries', 'utilities', 'food', 'travel', 'other'],
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },
    expenseType: {
      type: String,
      enum: {
        values: ['recurring', 'one-off'],
        message: '{VALUE} is not a valid expense type',
      },
      required: [true, 'Expense type is required'],
    },
    splitType: {
      type: String,
      enum: {
        values: ['equal', 'percentage', 'custom'],
        message: '{VALUE} is not a valid split type',
      },
      required: [true, 'Split type is required'],
    },
    splits: {
      type: [splitItemSchema],
      required: [true, 'Splits are required'],
      validate: {
        validator(val) {
          if (!Array.isArray(val) || val.length === 0) return false;
          const totalSplits = val.reduce((sum, item) => sum + item.amountPaise, 0);
          return totalSplits === this.amountPaise;
        },
        message: 'Sum of splits ({VALUE}) must exactly match total amount in paise',
      },
    },
    date: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
