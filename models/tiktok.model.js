const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
Schema = mongoose.Schema;

const tiktokSchema = mongoose.Schema({
  ageGroup: {
    type: String
  },
  audience: {
    type: Schema.Types.Mixed,
    default: {}
  },
  audienceLikers: {
    type: Schema.Types.Mixed,
    default: {}
  },
  avgComments: {
    type: Number
  },
  avgLikes: {
    type: Number
  },
  avgEngagements: {
    type: Number
  },
  avgViews: {
    type: Number
  },
  city: {
    type: String
  },
  contacts: [
    {
      type: Schema.Types.Mixed,
      default: {}  
    }
  ],
  country: {
    type: String
  },
  gender: {
    type: String
  },
  hashtags: [
    {
      tag: {
        type: String,
      },
      weight: {
        type: Number
      }
    }
  ],
  interests: [
    {
      type: Schema.Types.Mixed,
      default: {}  
    }
  ],
  language: {
    type: Schema.Types.Mixed,
    default: {}  
  },
  lastUpdated: {
    type: String
  },
  lookalikes: [
    {
      type: Schema.Types.Mixed,
      default: {}
    }
  ],
  mentions: [
    {
      type: Schema.Types.Mixed,
      default: {}
    }
  ],
  popularPosts: [
    {
      type: Schema.Types.Mixed,
      default: {}  
    }
  ],
  postsCount: {
    type: Number
  },
  profile: {
    type: Schema.Types.Mixed,
    default: {}
  },
  recentPosts: [
    {
      type: Schema.Types.Mixed,
      default: {}  
    }
  ],
  statHistory: [
    {
      type: Schema.Types.Mixed,
      default: {}  
    }
  ],
  userId: {
    type: String
  }
},
{
  timestamps: true, strict: false
}
);

// add plugin that converts mongoose to json
tiktokSchema.plugin(toJSON);
tiktokSchema.plugin(paginate);
tiktokSchema.set('timestamps', true);

/**
 * @typedef Tiktok
 */
const Tiktok = mongoose.models.tiktoks || mongoose.model('tiktoks', tiktokSchema);

module.exports = Tiktok;