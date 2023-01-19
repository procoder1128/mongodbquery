import _ from 'lodash';
import moment from 'moment';
const mongoose = require('mongoose');
const {
  Influencers,
  Campaign,
  Instagram,
  Youtube,
  Tiktok,
  UserTags,
} = require('models');
const toObjectId = mongoose.Types.ObjectId;
import { CampaignRepo, UserTagsRepo } from '.';
import Constants, { dateToPeriod, audienceLimit } from 'constants/constants';
import Lang from 'constants/lang';

const InfluencerRepo = {
  getAllCampaignsAmongToUser,
  getUsersCampaings,
  getInfluencers,
  getInfluencerByTag,
  getInfluencerTags,
  getCampaignsWithInfId,
  getTagsByAccountId,
  updateInfluencer,
  updateInfluencerTags,
  saveInfluencer,
};

async function getAllCampaignsAmongToUser(userId, catType) {
  const cmpList = await CampaignRepo.getCampaignList(userId);
  const results =
    cmpList?.filter(
      (itm) =>
        itm.sns === catType && (itm.visible ?? true) && !(itm.deleted ?? false),
    ) ?? [];

  return results.map((itm) => {
    return {
      id: itm._id.toString(),
      name: itm.name,
      sns: itm.sns,
      type: itm.type,
      mems: itm.mems,
    };
  });
}

async function getUsersCampaings(userId, accountId) {
  let list = await Influencers.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        _id: toObjectId(accountId),
      },
    },
    {
      $project: {
        _id: 0,
        infId: 1,
        type: 1,
        avatar: 1,
        name: 1,
        email: 1,
        link: 1,
        star: 1,
        memo: 1,
        campaigns: 1,
        tags: 1,
        infName: 1,
      },
    },
    {
      $unwind: {
        path: '$campaigns',
      },
    },
    {
      $lookup: {
        from: 'campaigns',
        localField: 'campaigns',
        foreignField: '_id',
        as: 'camp_doc',
      },
    },
    {
      $unwind: {
        path: '$camp_doc',
      },
    },
    {
      $project: {
        cid: '$campaigns',
        infId: 1,
        avatar: 1,
        type: 1,
        name: 1,
        infName: 1,
        email: 1,
        link: 1,
        star: 1,
        memo: 1,
        tags: 1,
        cname: '$camp_doc.name',
        csns: '$camp_doc.sns',
        ctype: '$camp_doc.type',
        cmems: { $size: '$camp_doc.members' },
        cdate: '$camp_doc.createdAt',
        deleted: '$camp_doc.deleted',
      },
    },
  ]);

  let orgTags = await UserTags.findOne({ userId: toObjectId(userId) });
  if (!orgTags) {
    list.tags = [];
    return list;
  }

  let isExists = -1;
  let temp = list?.[0].tags.map((itm) => {
    isExists = _.findIndex(orgTags.tags, (orgTag) => {
      return orgTag._id.toString() === itm.toString();
    });
    if (isExists === -1) return { tagId: '' };

    return {
      tagId: itm,
      name: orgTags.tags[isExists].name,
      color: orgTags.tags[isExists].color,
    };
  });

  list[0].tags = _.filter(temp, (itm) => itm.tagId !== '');

  return list;
}

async function getInfluencerTags(userId, infId) {
  const record = await Influencers.findOne({
    userId: toObjectId(userId),
    infId,
  });
  const tags = record?.tags ?? [];

  const orgTags = await UserTags.findOne({ userId: toObjectId(userId) });
  if (!orgTags) return [];

  let isExists = -1;

  return tags
    .map((itm) => {
      isExists = _.findIndex(orgTags.tags, (orgTag) => {
        return orgTag._id.toString() === itm.toString();
      });
      if (isExists === -1) return { tagId: '' };

      return {
        tagId: itm,
        name: orgTags.tags[isExists].name,
        color: orgTags.tags[isExists].color,
      };
    })
    .filter((itm) => itm.tagId !== '');
}

async function getTagsByAccountId(userId, accountId) {
  const record = await Influencers.findOne({
    userId: toObjectId(userId),
    _id: toObjectId(accountId),
  });
  const selected = record?.tags ?? [];

  const tags = await UserTagsRepo.getList(userId);

  return { tags, selected };
}

async function getCampaignsWithInfId(userId, infId, catType) {
  const record = await Influencers.findOne({
    userId: toObjectId(userId),
    infId: infId,
  });
  const selected = record?.campaigns ?? [];

  const cmpList = await CampaignRepo.getCampaignList(userId);
  const campaigns = cmpList
    ?.filter(
      (itm) =>
        itm.sns === catType && (itm.visible ?? true) && !(itm.deleted ?? false),
    )
    ?.map((itm) => {
      return {
        id: itm._id.toString(),
        name: itm.name,
        sns: itm.sns,
        type: itm.type,
        mems: itm.mems,
      };
    });

  return { campaigns, selected };
}

function _getMatchPattern(userId, type, filters) {
  let matchPattern = { userId: toObjectId(userId) };
  if (type) matchPattern = { ...matchPattern, type };

  let influencer = filters?.influencer;
  if (!filters || !influencer) return matchPattern;

  const {
    username,
    followers,
    view,
    amount,
    genre,
    memo,
    feed,
    story,
    ril,
    tags,
  } = influencer;

  if (username?.length > 0) {
    const result = influencer.username.map((infName) => {
      return { infName };
    });
    matchPattern = {
      ...matchPattern,
      $or: result,
    };
    return matchPattern;
  }

  if (followers?.min > 0) {
    if (influencer.followers.min == '1000000+')
      matchPattern = { ...matchPattern, followers: { $gte: 1000000 } };
    else
      matchPattern = {
        ...matchPattern,
        followers: { $gte: influencer.followers.min },
      };
  }

  if (followers?.max > 0 && followers?.min != '1000000+') {
    matchPattern = {
      ...matchPattern,
      followers: {
        ...matchPattern?.followers,
        $lte: influencer.followers.max,
      },
    };
  }

  if (view) {
    if (influencer.view.min > 0) {
      if (influencer.view.min == '1000000+')
        matchPattern = { ...matchPattern, recycle: { $gte: 1000000 } };
      else
        matchPattern = {
          ...matchPattern,
          recycle: { $gte: influencer.view.min },
        };
    }
    if (influencer.view.max > 0 && influencer.view.min != '1000000+') {
      matchPattern = {
        ...matchPattern,
        recycle: { ...matchPattern?.recycle, $lte: influencer.view.max },
      };
    }
  }

  if (amount) {
    if (influencer.amount.min > 0) {
      if (influencer.amount.min == '1000000+')
        matchPattern = { ...matchPattern, amount: { $gte: 1000000 } };
      else
        matchPattern = {
          ...matchPattern,
          amount: { $gte: influencer.amount.min },
        };
    }
    if (influencer.amount.max > 0 && influencer.amount.min != '1000000+') {
      matchPattern = {
        ...matchPattern,
        amount: { ...matchPattern?.amount, $lte: influencer.amount.max },
      };
    }
  }

  if (genre) {
    matchPattern = { ...matchPattern, 'genre.genrename': influencer.genre };
  }

  if (memo) {
    matchPattern = {
      ...matchPattern,
      $or: [
        { memo: { $regex: influencer.memo } },
        { shopping: { $regex: influencer.memo } },
      ],
    };
  }

  // フィード
  if (feed?.rich) {
    matchPattern = { ...matchPattern, rich: +feed.rich };
  }

  if (feed?.saving) {
    matchPattern = { ...matchPattern, saving: +feed.saving };
  }

  // ストーリー
  if (story?.inp) {
    matchPattern = { ...matchPattern, inp: +story.inp };
  }

  if (story?.click) {
    matchPattern = { ...matchPattern, click: +story.click };
  }

  if (story?.stamp) {
    matchPattern = { ...matchPattern, stamp: +story.stamp };
  }

  // リール
  if (ril?.rich) {
    matchPattern = { ...matchPattern, rich: +ril.rich };
  }

  if (ril?.saving) {
    matchPattern = { ...matchPattern, saving: +ril.saving };
  }

  if (tags?.length > 0) {
    const searchTags = tags.map((itm) => {
      return toObjectId(itm);
    });
    matchPattern = { ...matchPattern, tags: { $all: searchTags } };
  }

  return matchPattern;
}

async function getInfluencers({ userId, type, filters, page = 1 }) {
  const {
    username,
    gender: influencerGender,
    engagementRate,
    lastposted,
    feed,
    story,
    ril,
    youtube,
    tiktok,
  } = filters?.influencer ?? {};
  const { age, interests, location, gender: audienceGender, credibility } =
    filters?.audience ?? {};

  let matchCondition = _getMatchPattern(userId, type, filters);

  let list = [];
  try {
    let params = [
      { $match: matchCondition },
      {
        $lookup: {
          from: `${type}s`,
          localField: 'infId',
          foreignField: 'userId',
          as: 'inf_doc',
        },
      },
      {
        $unwind: {
          path: '$inf_doc',
        },
      },
      {
        $skip: Math.max((page - 1) * 50, 0),
      },
      {
        $limit: 50,
      },
    ];

    list = await Influencers.aggregate(params, { allowDiskUse: true }).then(
      (response) => {
        let temp = response;
        if (username?.length > 0) {
          return temp;
        }

        temp = temp.reduce((unique, o) => {
          if (!unique.some((obj) => obj.infId === o.infId)) {
            unique.push(o);
          }
          return unique;
        }, []);

        if (influencerGender) {
          temp = temp.filter(({ inf_doc }) => {
            return inf_doc?.gender === influencerGender;
          });
        }
        if (engagementRate) {
          temp = temp.filter(({ inf_doc }) => {
            return inf_doc?.profile?.engagementRate >= engagementRate;
          });
        }
        if (lastposted) {
          temp = temp.filter(({ inf_doc }) => {
            return (
              dateToPeriod(inf_doc?.recentPosts?.[0]?.created) <= lastposted
            );
          });
        }

        if (feed?.richper)
          temp = temp.filter(
            ({ rich, followers }) =>
              rich && followers && (rich / followers) * 100 > feed.richper,
          );
        if (feed?.savingper)
          temp = temp.filter(
            ({ rich, saving }) =>
              rich && saving && (saving / rich) * 100 > feed.savingper,
          );
        if (feed?.eg)
          temp = temp.filter(
            ({ rich, comment, oks }) =>
              rich &&
              comment &&
              oks &&
              ((+oks + +comment) / rich) * 100 > feed.eg,
          );
        if (feed?.roas)
          temp = temp.filter(
            ({ sell, amount }) =>
              sell && amount && (sell / amount) * 100 > feed.roas,
          );

        if (story?.inpper)
          temp = temp.filter(
            ({ inp, followers }) =>
              inp && followers && (inp / followers) * 100 > story.inpper,
          );
        if (story?.clickper)
          temp = temp.filter(
            ({ click, followers }) =>
              click && followers && (click / followers) * 100 > story.clickper,
          );
        if (story?.stampper)
          temp = temp.filter(
            ({ stamp, followers }) =>
              stamp && followers && (stamp / followers) * 100 > story.stampper,
          );
        if (story?.roas)
          temp = temp.filter(
            ({ sell, amount }) =>
              sell && amount && (sell / amount) * 100 > story.roas,
          );

        if (ril?.richper)
          temp = temp.filter(
            ({ rich, followers }) =>
              rich && followers && (rich / followers) * 100 > ril.richper,
          );
        if (ril?.savingper)
          temp = temp.filter(
            ({ rich, saving }) =>
              rich && saving && (saving / rich) * 100 > ril.savingper,
          );
        if (ril?.eg)
          temp = temp.filter(
            ({ rich, comments, oks }) =>
              rich &&
              comment &&
              oks &&
              ((+oks + +comment) / rich) * 100 > ril.eg,
          );
        if (ril?.roas)
          temp = temp.filter(
            ({ sell, amount }) =>
              sell && amount && (sell / amount) * 100 > ril.roas,
          );

        if (youtube?.click)
          temp = temp.filter(
            ({ click, recycle }) =>
              click && recycle && (click / recycle) * 100 > youtube.click,
          );
        if (youtube?.cv)
          temp = temp.filter(
            ({ cv, recycle }) =>
              cv && recycle && (cv / recycle) * 100 > youtube.cv,
          );
        if (youtube?.eg)
          temp = temp.filter(
            ({ oks, followers }) =>
              oks && followers && (oks / followers) * 100 > youtube.eg,
          );
        if (youtube?.roas)
          temp = temp.filter(
            ({ sell, amount }) =>
              sell && amount && (sell / amount) * 100 > youtube.roas,
          );

        if (tiktok?.eg)
          temp = temp.filter(
            ({ click, share }) =>
              click && share && (click / share) * 100 > tiktok.eg,
          );
        if (tiktok?.share)
          temp = temp.filter(
            ({ oks, followers }) =>
              oks && followers && (oks / followers) * 100 > tiktok.share,
          );
        if (tiktok?.roas)
          temp = temp.filter(
            ({ sell, amount }) =>
              sell && amount && (sell / amount) * 100 > tiktok.roas,
          );

        if (age?.length > 0) {
          temp = temp.filter(({ inf_doc }) => {
            const group = inf_doc?.audience.ages?.filter((_itm) => {
              return age.includes(_itm.code);
            });
            return group.some((el) => {
              return el.weight >= audienceLimit.age;
            });
          });
        }
        if (interests?.length > 0) {
          temp = temp.filter(({ inf_doc }) => {
            const group = inf_doc?.audience?.interests?.filter((interest) => {
              return interests.includes(interest.name);
            });
            return group.some((el) => {
              return el.weight >= audienceLimit.interests;
            });
          });
        }
        if (location?.length > 0) {
          temp = temp.filter(({ inf_doc }) => {
            const group = inf_doc?.audience?.geoCities?.filter((city) => {
              return location.includes(city.name);
            });
            return group.some((el) => {
              return el.weight >= audienceLimit.location;
            });
          });
        }
        if (audienceGender) {
          temp = temp.filter(({ inf_doc }) => {
            let group = inf_doc?.audience?.genders?.find((gender) => {
              return gender.code === audienceGender;
            });
            return group.weight >= audienceLimit.gender;
          });
        }
        if (credibility) {
          temp = temp.filter(({ inf_doc }) => {
            return inf_doc?.audience?.credibility >= credibility;
          });
        }
        let tags = [];
        temp = temp.map((itm) => {
          tags = itm.tags?.map((tag) => tag.toString()) ?? [];
          return {
            ...itm,
            _id: itm._id.toString(),
            cdate: moment(itm.createdAt).format('YYYY/M/D'),
            tags,
          };
        });

        return temp;
      },
    );
  } catch (ex) {
    console.error(ex);
  }

  return list;
}

async function getInfluencerByTag({ page = 0, sort, filters }) {
  let influencer = filters?.influencer;
  let audience = filters?.audience;
  let hashtags = _.map(influencer.hashtagEngagement, (itm) => {
    return itm.tag;
  });
  let query = _.map(influencer.hashtagEngagement, (itm) => {
    return { 'hashtagengage.tag': itm.tag };
  });
  let cond = _.map(influencer.hashtagEngagement, (itm) => {
    return { $eq: ['$$item.tag', itm.tag] };
  });
  let matchQuery =
    influencer.hashtagEngagement.length == 1 ? query[0] : { $and: query };
  let total = 0;

  console.time('Get hashtagEngagement data');

  let params = [
    { $match: matchQuery },
    {
      $project: {
        _id: 0,
        userId: 1,
        'audience.genders': 1,
        'audience.ages': 1,
        gender: 1,
        hashtagengage: {
          $filter: {
            input: '$hashtagengage',
            as: 'item',
            cond: { $or: cond },
          },
        },
        profile: 1,
      },
    },
  ];

  const { field = 'followers', direction = 'desc' } = sort;
  if (field === 'followers')
    params.push({
      $sort: { 'profile.followers': direction == 'asc' ? 1 : -1 },
    });

  let list = await Instagram.aggregate(params, { allowDiskUse: true })
    .then((response) => {
      console.timeEnd('Get hashtagEngagement data');

      let temp = response;
      temp = temp.reduce((unique, o) => {
        if (!unique.some((obj) => obj.userId === o.userId)) {
          unique.push(o);
        }
        return unique;
      }, []);

      temp = _.filter(temp, (itm) => {
        let group = _.filter(itm.hashtagengage, (val) => {
          return hashtags.includes(val.tag);
        });

        let engagementRate = group.reduce((a, c) => {
          return Math.min(+c.weight, a);
        }, 100);

        itm.profile.engagementRate = engagementRate / 100;

        let match = _.map(group, (el) => {
          let tagIndex = influencer.hashtagEngagement.findIndex(
            (item) => item.tag === el.tag,
          );
          return (
            el.weight >= influencer.hashtagEngagement[tagIndex].value * 100
          );
        });
        return match.every((v) => v === true);
      });

      if (field === 'engagements') {
        const multiplier = direction === 'asc' ? 1 : -1;
        temp?.sort(
          (a, b) =>
            (a.profile.engagementRate - b.profile.engagementRate) * multiplier,
        );
      }

      if (Object.keys(influencer.followers).length !== 0) {
        temp = _.filter(temp, (itm) => {
          let match = [];
          if (influencer.followers.min > 0) {
            if (influencer.followers.min == '1000000+')
              match.push(itm.profile.followers >= 1000000);
            else match.push(itm.profile.followers >= influencer.followers.min);
          }
          if (
            influencer.followers.max > 0 &&
            influencer.followers.min != '1000000+'
          ) {
            match.push(itm.profile.followers <= influencer.followers.max);
          }
          return match.every((v) => v === true);
        });
      }

      if (influencer?.engagementRate) {
        temp = _.filter(temp, (itm) => {
          return itm.profile.engagementRate >= influencer.engagementRate;
        });
      }

      if (influencer?.gender) {
        temp = _.filter(temp, (itm) => {
          return itm.gender === influencer.gender;
        });
      }
      // if (influencer?.interests.length !== 0) {
      //   temp = _.filter(temp, (itm) => {
      //     return itm.gender === influencer.gender;
      //   });
      // }

      if (audience?.age && audience?.age.length !== 0) {
        temp = _.filter(temp, (itm) => {
          let group = _.filter(itm.audience.ages, (age) => {
            return audience.age.includes(age.code);
          });
          let match = _.map(group, (el) => {
            return el.weight >= audienceLimit.age;
          });
          return match.some((v) => v === true);
        });
      }
      // if (audience?.interests && audience?.interests.length !== 0) {
      //   temp = _.filter(temp, (itm) => {
      //     let group = _.filter(itm.inf_doc.audience.interests, (interest) => {
      //       return audience.interests.includes(interest.name);
      //     });
      //     let match = _.map(group, (el) => {
      //       return el.weight >= audienceLimit.interests;
      //     });
      //     return match.some((v) => v === true);
      //   });
      // }
      // if (audience?.location && audience?.location.length !== 0) {
      //   temp = _.filter(temp, (itm) => {
      //     let group = _.filter(itm.audience.geoCities, (city) => {
      //       return audience.location.includes(city.name);
      //     });
      //     let match = _.map(group, (el) => {
      //       return el.weight >= audienceLimit.location;
      //     });
      //     return match.some((v) => v === true);
      //   });
      // }//FIXME
      if (audience?.gender) {
        temp = _.filter(temp, (itm) => {
          let group = _.find(itm.audience.genders, (gender) => {
            return gender.code === audience.gender;
          });
          return group.weight >= audienceLimit.gender;
        });
      }
      total = temp.length;
      if (page < 1) {
        temp = temp.slice(0, 15);
      } else {
        temp = temp.slice(page * 15, (page + 1) * 15);
      }

      let results = _.map(temp, (itm) => {
        return {
          userId: itm.userId,
          profile: itm.profile,
        };
      });

      return results;
    })
    .catch((err) => console.log(err));

  return {
    error: false,
    total: total,
    directs: [],
    lookalikes: list,
    isExactMatch: true,
  };
}

async function updateInfluencer(userId, id, star, memo) {
  let oldInfluencer = await Influencers.findOne({
    _id: toObjectId(id),
    userId: toObjectId(userId),
  });

  for (let _id of oldInfluencer?.campaigns ?? []) {
    await Campaign.updateOne(
      { _id, 'members.accountId': toObjectId(id) },
      { $set: { 'members.$.star': star, 'members.$.memo': memo } },
    );
  }

  await Influencers.updateOne(
    {
      _id: toObjectId(id),
      userId: toObjectId(userId),
    },
    { star, memo },
  );

  return true;
}

async function saveInfluencer(userId, infId, catType, campId, checkStatus) {
  let oldInfluencer = await Influencers.findOne({
    userId: toObjectId(userId),
    infId,
    type: catType,
  });

  try {
    if (!oldInfluencer) {
      const models = {
        [Constants.snsInstagram]: Instagram,
        [Constants.snsTiktok]: Tiktok,
        [Constants.snsYoutube]: Youtube,
      };
      let info = await models[catType].findOne({ userId: infId });

      oldInfluencer = await Influencers.create({
        userId: toObjectId(userId),
        infId,
        name: info.profile.fullname ?? '',
        infName: info.profile.username ?? '',
        link: info.profile.url ?? '',
        followers: info.profile.followers ?? 0,
        engage: info.profile.engagements ?? 0,
        engagerate:
          catType === Constants.snsInstagram
            ? info.profile.engagementRate ?? 0
            : info?.avgEngagements ?? 0,
        avatar: info.profile.picture ?? '',
        oks: 0,
        comment: 0,
        recycle: info.avgViews ?? 0,
        type: catType,
        campaigns: [],
      });
    }

    const {
      _id,
      campaigns,
      genre,
      infName,
      name,
      link,
      followers,
      engage,
      engagerate,
      avatar,
      oks,
      comment,
      recycle,
      type,
    } = oldInfluencer;

    const campInfo = await Campaign.findOne({ _id: toObjectId(campId) });
    const influencer = campInfo?.members?.filter(
      (itm) => itm.accountId?.toString() === _id.toString(),
    );

    if (!checkStatus) {
      if (influencer.length < 1) {
        throw {
          status: Constants.errors.badrequest,
          message: Lang.communcation_errs.e039,
        };
      }

      if (influencer[0].step !== 1 || influencer[0].status !== 1) {
        return Lang.communcation_errs.e031;
      }

      await Campaign.updateOne(
        { _id: toObjectId(campId) },
        { $pull: { members: { accountId: _id } } },
      );

      await Influencers.updateOne(
        { _id },
        {
          $set: {
            campaigns: campaigns.filter((itm) => itm.toString() !== campId),
          },
        },
      );

      return true;
    }

    // add member to new campaigns
    genre.push({ genrename: campInfo.type });

    if (influencer.length > 0) {
      return Lang.communcation_errs.e032;
    }

    await Campaign.updateOne(
      { _id: toObjectId(campId) },
      {
        $addToSet: {
          members: {
            accountId: _id,
            infId,
            infName,
            name,
            link,
            followers,
            engage,
            engagerate,
            avatar,
            oks,
            comment,
            recycle,
            type,
          },
        },
      },
    );

    await Influencers.updateOne(
      { _id },
      {
        $set: {
          genre,
          campaigns: [...campaigns, toObjectId(campId)],
        },
      },
    );
  } catch (err) {
    throw {
      status: Constants.errors.badrequest,
      message: Lang.communcation_errs.e039,
    };
  }

  return true;
}

async function updateInfluencerTags(accountId, tagId, checkStatus) {
  try {
    const _id = toObjectId(accountId);

    await Influencers.updateOne(
      { _id },
      { [!checkStatus ? $pull : $addToSet]: { tags: toObjectId(tagId) } },
    );
  } catch (err) {
    throw {
      status: Constants.errors.badrequest,
      message: Lang.communcation_errs.e039,
    };
  }

  return true;
}

export default InfluencerRepo;
