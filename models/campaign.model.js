const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate } = require('./plugins');
const toObjectId = mongoose.Types.ObjectId;

const campaignSchema = mongoose.Schema(
  {
    userId: {
      type: toObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    sns: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    list: {
      type: String,
      default: '',
      required: false,
    },
    visible: {
      type: Boolean,
      default: true,
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    monitoring: {
      isSet: {
        type: Boolean,
        default: false,
        required: true,
      },
      members: {
        type: Array,
        default: [],
      },
      hashtag: {
        type: Array,
        default: [],
      },
      mention: {
        type: Array,
        default: [],
      },
      tag: {
        type: Array,
        default: [],
      },
      hasAllTagAndMention: {
        type: Boolean,
        default: false,
      },
      monitorFrom: {
        type: Date,
      },
      monitorTo: {
        type: Date,
      },
    },
    members: [
      {
        accountId: {
          type: toObjectId,
          required: true,
        },
        infId: {
          type: String,
          required: true,
        },
        infName: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        avatar: {
          type: String,
          default: '',
        },
        link: {
          type: String,
          default: '',
        },
        type: {
          type: String,
          default: '',
        },
        star: {
          type: Number,
          default: 0,
        },
        postAt: {
          type: Date,
        },
        postLink: {
          type: String,
          default: '',
        },
        amount: {
          type: Number,
          default: 0,
        },
        shopping: {
          type: String,
          default: '',
        },
        followers: {
          type: Number,
          default: 0,
        },
        registers: {
          type: Number,
          default: 0,
        },
        recycle: {
          type: Number,
          default: 0,
        },
        engage: {
          type: Number,
          default: 0,
        },
        engagerate: {
          type: Number,
          default: 0,
        },
        inp: {
          type: Number,
          default: 0,
        },
        budget: {
          type: Number,
          default: 0,
        },
        click: {
          type: Number,
          default: 0,
        },
        stamp: {
          type: Number,
          default: 0,
        },
        rich: {
          type: Number,
          default: 0,
        },
        saving: {
          type: Number,
          default: 0,
        },
        oks: {
          type: Number,
          default: 0,
        },
        comment: {
          type: Number,
          default: 0,
        },
        normal: {
          type: Number,
          default: 0,
        },
        prs: {
          type: Number,
          default: 0,
        },
        share: {
          type: Number,
          default: 0,
        },
        sell: {
          type: Number,
          default: 0,
        },
        roas: {
          type: Number,
          default: 0,
        },
        good: {
          type: Number,
          default: 0,
        },
        bad: {
          type: Number,
          default: 0,
        },
        cv: {
          type: Number,
          default: 0,
        },
        memo: {
          type: String,
        },
        step: {
          type: Number,
          required: true,
          default: 1,
        },
        status: {
          type: Number,
          required: true,
          default: 1,
        },
        pstatus: {
          type: Number,
          required: true,
          default: 1,
        },
        rtype: {
          type: Number,
          required: true,
          default: 0,
        },
        tags: [
          {
            type: toObjectId,
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// add plugin that converts mongoose to json
campaignSchema.plugin(toJSON);
campaignSchema.plugin(paginate);
campaignSchema.set('timestamps', true);

/**
 * @typedef Campaign
 */
const Campaign =
  mongoose.models.campaigns || mongoose.model('campaigns', campaignSchema);

module.exports = Campaign;
