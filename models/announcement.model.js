const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const announcementSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    from: {
      type: String,
    },
    to: {
      type: String,
    },
    status: {
      type: Number,
    },
    users: {
      type: [String],
    },
    link: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
announcementSchema.plugin(toJSON);
announcementSchema.plugin(paginate);
announcementSchema.set('timestamps', true);

/**
 * @typedef Announcement
 */
const Announcement =
  mongoose.models.announcements ||
  mongoose.model('announcements', announcementSchema);

module.exports = Announcement;
