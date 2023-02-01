const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const TrialSchema = mongoose.Schema(
  {
    trialId: {
      type: String,
      required: true,
      unique: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    usage: {
      type: Number,
      required: true,
    },
    disabled: {
      type: Boolean,
      required: true,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
TrialSchema.plugin(toJSON);
TrialSchema.plugin(paginate);
TrialSchema.set('timestamps', true);

/**
 * @typedef Trial
 */
const Trial = mongoose.models.trial || mongoose.model('trial', TrialSchema);

module.exports = Trial;
