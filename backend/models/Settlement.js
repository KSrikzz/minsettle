import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group is required'],
      index: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer is required'],
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payee is required'],
    },
    amountPaise: {
      type: Number,
      required: [true, 'Amount in paise is required'],
      validate: {
        validator(val) {
          return Number.isInteger(val) && val > 0;
        },
        message: 'Settlement amount must be a positive integer in paise',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'stale'],
        message: '{VALUE} is not a valid settlement status',
      },
      default: 'pending',
      required: true,
    },
    method: {
      type: String,
      enum: {
        values: ['upi', 'manual'],
        message: '{VALUE} is not a valid settlement method',
      },
      default: 'upi',
      required: true,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    computedAt: {
      type: Date,
      required: [true, 'computedAt timestamp is required'],
      default: Date.now,
    },
    isStale: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

function preventDelete() {
  throw new Error('Settlement records are immutable and cannot be deleted.');
}

settlementSchema.pre('deleteOne', preventDelete);
settlementSchema.pre('deleteMany', preventDelete);
settlementSchema.pre('findOneAndDelete', preventDelete);
settlementSchema.pre('findByIdAndDelete', preventDelete);

settlementSchema.pre('save', function preventPaidModification() {
  if (!this.isNew && this.isModified() && this._originalStatus === 'paid') {
    throw new Error('Paid settlement records are immutable and cannot be modified.');
  }
});

settlementSchema.post('init', function setOriginalStatus() {
  this._originalStatus = this.status;
});

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
