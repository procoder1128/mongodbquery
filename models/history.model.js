const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const toObjectId = mongoose.Types.ObjectId;

const historySchema = mongoose.Schema({
  userId: {
    type: toObjectId,
    required: true,
  },
  history: [{
    historydate: {
      type: String,
    },
    paytype: {
      type: Number,
      required: true,
      default: 0,
    },
    periodtype: {
      type: Number,
      required: true,
      default: 0
    },
    plantype: {
      type: String,
      required: true,
      default: 'Free trial'
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: Number,
      required: true
    },
    memo: {
      type: String
    }
  }]
},
{
  timestamps: true,
}
);

// add plugin that converts mongoose to json
historySchema.plugin(toJSON);
historySchema.plugin(paginate);
historySchema.set('timestamps', true);

/**
 * @typedef History
 */
const History = mongoose.models.history || mongoose.model('history', historySchema);

module.exports = History;