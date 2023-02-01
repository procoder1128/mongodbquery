const mongoose = require('mongoose');
const {toJSON, paginate } = require('./plugins');

const planSchema = mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  monthval: {
    type: Number,
  },
  yearval: {
    type: Number,
  },
  isfree: {
    type: Number,
  },
  pages: {
    type: Number,
  },
  profies: {
    type: Number,
  },
  reports: {
    type: Number,
  },
  csv: {
    type: Number,
  },
  saves: {
    type: Number,
  },
  isinsight: {
    type: Boolean,
  },
  isaccount: {
    type: Boolean,
  },
  iscampaign: {
    type: Boolean
  }
},
{
  timestamps: true,
}
);

// add plugin that converts mongoose to json
planSchema.plugin(toJSON);
planSchema.plugin(paginate);
planSchema.set('timestamps', true);

/**
 * @typedef User
 */
const Plans = mongoose.models.plans || mongoose.model('plans', planSchema);

module.exports = Plans;