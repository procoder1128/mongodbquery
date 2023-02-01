const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
Schema = mongoose.Schema;

const instagramIdSchema = mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

// add plugin that converts mongoose to json
instagramIdSchema.plugin(paginate);
instagramIdSchema.set('timestamps', true);

/**
 * @typedef Instagram
 */
const InstagramId =
  mongoose.models.instagram_ids ||
  mongoose.model('instagram_ids', instagramIdSchema);

module.exports = InstagramId;
