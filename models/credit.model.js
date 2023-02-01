const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const CreditSchema = mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    weight: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
CreditSchema.plugin(toJSON);
CreditSchema.plugin(paginate);
CreditSchema.set('timestamps', true);

/**
 * @typedef User
 */
const Credit = mongoose.models.credit || mongoose.model('credit', CreditSchema);

module.exports = Credit;
