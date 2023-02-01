const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const toObjectId = mongoose.Types.ObjectId;

const usertagSchema = mongoose.Schema(
  {
    userId: {
      type: toObjectId,
      required: true,
    },
    tags: [
      {
        name: String,
        color: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
usertagSchema.plugin(toJSON);
usertagSchema.plugin(paginate);
usertagSchema.set('timestamps', true);

/**
 * @typedef User
 */
const UserTags =
  mongoose.models.usertags || mongoose.model('usertags', usertagSchema);

module.exports = UserTags;
