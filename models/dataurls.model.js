const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const dataUrlsSchema = mongoose.Schema(
  {
    data: {
      type: String,
    },
    hash: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
dataUrlsSchema.plugin(toJSON);
dataUrlsSchema.plugin(paginate);
dataUrlsSchema.set('timestamps', true);

/**
 * @typedef DataUrls
 */
const DataUrls =
  mongoose.models.dataurls || mongoose.model('dataurls', dataUrlsSchema);

module.exports = DataUrls;
