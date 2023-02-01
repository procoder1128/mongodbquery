const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const MemoSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    influencerId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
    },
    content: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
MemoSchema.plugin(toJSON);
MemoSchema.plugin(paginate);
MemoSchema.set('timestamps', true);

/**
 * @typedef User
 */
const Memo = mongoose.models.memo || mongoose.model('memo', MemoSchema);

module.exports = Memo;
