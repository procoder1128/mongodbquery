const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate } = require('./plugins');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    addr: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    plantype: {
      type: String,
      required: true,
      default: 'Free trial',
    },
    periodtype: {
      type: Number,
      required: true,
      default: 0,
    },
    paytype: {
      type: Number,
      required: true,
      default: 0,
    },
    paystart: {
      type: String,
    },
    payend: {
      type: String,
    },
    paystatus: {
      type: Number,
    },
    loginAt: {
      type: String,
    },
    updateMode: {
      type: Boolean,
    },
    perms: {
      type: String,
      required: true,
      default: 'user',
    },
    agreed: {
      type: Boolean,
      default: false,
      required: true,
    },
    termshowed: {
      type: Boolean,
      default: false,
      required: true,
    },
    creditNumber: {
      type: Number,
      required: true,
      default: 1000,
    },
    salesPerson: {
      type: String,
    },
    trialId: {
      type: String,
    },
    postingMethod: {
      type: String,
      default: 'none',
    },
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
userSchema.set('timestamps', true);

/**
 * @typedef User
 */
const User = mongoose.models.users || mongoose.model('users', userSchema);

module.exports = User;
