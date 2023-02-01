const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const toObjectId = mongoose.Types.ObjectId;

const loginHistorySchema = mongoose.Schema(
  {
    userId: {
      type: toObjectId,
      required: true,
    },
    history: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
loginHistorySchema.plugin(toJSON);
loginHistorySchema.plugin(paginate);
loginHistorySchema.set('timestamps', true);

/**
 * @typedef User
 */
const LoginHistory =
  mongoose.models.loginhistory ||
  mongoose.model('loginhistory', loginHistorySchema);

module.exports = LoginHistory;
