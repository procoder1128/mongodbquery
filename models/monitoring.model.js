const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const toObjectId = mongoose.Types.ObjectId;

const MonitoringSchema = mongoose.Schema(
  {
    campId: {
      type: toObjectId,
      required: true,
    },
    infId: {
      type: String,
      required: true,
    },
    contents: {
      type: Array,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
MonitoringSchema.plugin(toJSON);
MonitoringSchema.plugin(paginate);
MonitoringSchema.set('timestamps', true);

/**
 * @typedef User
 */
const Monitoring =
  mongoose.models.monitoring || mongoose.model('monitoring', MonitoringSchema);

module.exports = Monitoring;
