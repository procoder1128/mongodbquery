const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
Schema = mongoose.Schema;

const instagramSchema = mongoose.Schema(
  {
    ageGroup: {
      type: String,
    },
    audience: {
      type: Schema.Types.Mixed,
      default: {},
    },
    audienceLikers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    avgComments: {
      type: Number,
    },
    avgLikes: {
      type: Number,
    },
    avgViews: {
      type: Number,
    },
    brandAffinity: [
      {
        id: {
          type: Number,
        },
        name: {
          type: String,
        },
      },
    ],
    city: {
      type: String,
    },
    contacts: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    country: {
      type: String,
    },
    gender: {
      type: String,
    },
    hashtags: [
      {
        tag: {
          type: String,
        },
        weight: {
          type: Number,
        },
      },
    ],
    hashtagengage: [
      {
        tag: {
          type: String,
        },
        weight: {
          type: Number,
        },
      },
    ],
    interests: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    language: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastUpdated: {
      type: String,
    },
    lookalikes: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    mentions: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    paidPostPerformance: {
      type: Number,
    },
    popularPosts: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    postsCount: {
      type: Number,
    },
    profile: {
      type: Schema.Types.Mixed,
      default: {},
    },
    recentPosts: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    sponsoredPosts: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    statHistory: [
      {
        type: Schema.Types.Mixed,
        default: {},
      },
    ],
    stats: {
      type: Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: String,
    },
    feed: {
      type: Array,
      default: [],
    },
    reel: {
      type: Array,
      default: [],
    },
    newHashtag: {
      type: Array,
      default: [],
    },
    newMention: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

// add plugin that converts mongoose to json
instagramSchema.plugin(toJSON);
instagramSchema.plugin(paginate);
instagramSchema.set('timestamps', true);

/**
 * @typedef Instagram
 */
const Instagram =
  mongoose.models.instagrams || mongoose.model('instagrams', instagramSchema);

module.exports = Instagram;
