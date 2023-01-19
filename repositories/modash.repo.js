import _ from 'lodash';
import moment from 'moment';
import { apiWrapper } from 'helpers';
import Constants from 'constants/constants';
const mongoose = require('mongoose');
const { Instagram, Youtube, Tiktok } = require('models');
const toObjectId = mongoose.Types.ObjectId;

import getConfig from 'next/config';
const { publicRuntimeConfig, serverRuntimeConfig } = getConfig();
const baseUrl = `${serverRuntimeConfig.modashUrl}`;
const fromExternal = publicRuntimeConfig.fromExternal;
const isTest = publicRuntimeConfig.testmode;

const ModashRepo = {
  downloadReportfromExternal,
  getCounts,
  getInstagram,
  getYoutube,
  getTiktok,
  getCountsPerPage,
  getInstagramPerPage,
  getYoutubePerPage,
  getTiktokPerPage,
  getInfluencerDetail,
  saveInstagram,
  saveYoutube,
  saveTiktok,
  updateInstagram,
  updateYoutubeAvgs,
  updateTiktokAvgs,
};

async function updateYoutubeAvgs(userId, views, likes, comments, engage) {
  try {
    await Youtube.updateOne(
      { userId: userId },
      {
        $set: {
          avgViews: views,
          avgComments: comments,
          avgLikes: likes,
          avgEngagements: engage,
        },
      },
    );
  } catch (e) {
    return e.toString();
  }
}

async function updateTiktokAvgs(userId, views, likes, comments, engage) {
  try {
    await Tiktok.updateOne(
      { userId: userId },
      {
        $set: {
          avgViews: views,
          avgComments: comments,
          avgLikes: likes,
          avgEngagements: engage,
        },
      },
    );
  } catch (e) {
    return e.toString();
  }
}

async function updateInstagram(userId, hashtagengage) {
  try {
    await Instagram.updateOne(
      { userId: userId },
      { $set: { hashtagengage: hashtagengage } },
    );
  } catch (e) {
    return e.toString();
  }
}

async function downloadReportfromExternal(type, userId, avgViews = 0) {
  let report = null,
    ret = false;
  try {
    await apiWrapper
      .get(`${baseUrl}/${type}/profile/${userId}/report`)
      .then((response) => {
        if (response.error === false) {
          report = response.profile;
        } else {
          ret = response.code;
        }
      })
      .catch((e) => {
        ret = e.code ?? e.message;
      });

    if (ret !== false) return null;

    // let lookalikes = await apiWrapper.post(`${baseUrl}/${type}/search`, {
    //   sort: {},
    //   page: 0,
    //   filter: {
    //     influencer: {
    //       "relevance": ['@' + report.profile.username],
    //     }
    //   },
    // }).then(response => {
    //   if (response.error === false) {
    //     return response.lookalikes;
    //   } else {
    //     ret = response.code;
    //   }
    // }).catch(e=>{
    //   ret = e.code;
    // });
    // if (ret !== false)
    //   report.lookalikes = lookalikes;

    report.lastUpdated = moment().format('YYYY-MM-DD');

    if (type === Constants.snsInstagram) {
      let hashtagengage = [];
      _.map(report.popularPosts, (itm) => {
        let followers = report.profile.followers ?? 0;
        let likes = itm.likes ?? 0;
        let comments = itm.comments ?? 0;

        let weight = followers > 0 ? ((likes + comments) / followers) * 100 : 0;
        _.map(itm.hashtags, (tag) => {
          let isExists = _.findIndex(
            hashtagengage,
            (engage) => engage.tag === tag,
          );
          if (weight < 0.01) return;

          if (isExists === -1) {
            hashtagengage.push({ tag: tag, weight: weight });
          } else {
            if (weight < hashtagengage[isExists].weight) return;

            hashtagengage[isExists].weight = weight;
          }
        });
      });
      report.hashtagengage = hashtagengage;
    } else {
      let comments = 0,
        likes = 0;
      _.map(report.recentPosts, (itm) => {
        if (itm.comments) comments += itm.comments;
        if (itm.likes) likes += itm.likes;
      });
      if (report.recentPosts && report.recentPosts.length > 0) {
        let counts = report.recentPosts.length;
        report.avgViews = avgViews;
        report.avgComments = comments / counts;
        report.avgLikes = likes / counts;
        if (avgViews > 0)
          report.avgEngagements = (comments + likes) / counts / avgViews;
        else report.avgEngagements = 0;
      }
    }

    if (type === Constants.snsInstagram) ret = await saveInstagram(report);
    else if (type === Constants.snsYoutube) ret = await saveYoutube(report);
    else ret = await saveTiktok(report);
  } catch (ex) {
    return null;
  }

  return report;
}

function _getMatchPattern(filters) {
  let matchPattern = {};
  if (filters.audience.age.length > 0) {
    let subquery = [];
    _.map(filters.audience.age, (stepAge) => {
      subquery.push({
        'audience.ages.code': stepAge.id,
        'audience.ages.weight': { $gte: stepAge.weight },
      });
      matchPattern = { ...matchPattern, $and: [...subquery] };
    });
  }
  if (filters.audience.gender !== null) {
    matchPattern = {
      ...matchPattern,
      'audience.genders.code': filters.audience.gender.id,
    };
    matchPattern = {
      ...matchPattern,
      'audience.genders.weight': { $gte: filters.audience.gender.weight },
    };
  }
  if (filters.audience.interests && filters.audience.interests.length > 0) {
    let subquery = [];
    _.map(filters.audience.interests, (stepInterest) => {
      subquery.push({
        'audience.interests.name': stepInterest.origin,
        'audience.interests.weight': { $gte: stepInterest.weight },
      });
      matchPattern = { ...matchPattern, $and: [...subquery] };
    });
  }
  if (filters.audience.language !== null) {
    //$and:[{'audience.languages.code':'en'}, {'audience.languages.weight':{$gte:0.1}}]
    matchPattern = {
      ...matchPattern,
      'audience.languages.code': filters.audience.language.id,
    };
    matchPattern = {
      ...matchPattern,
      'audience.languages.weight': { $gte: filters.audience.language.weight },
    };
  }
  if (filters.audience.location.length > 0) {
    const selLocation = filters.audience.location[0];
    matchPattern = {
      ...matchPattern,
      'audience.geoCities.name': selLocation.id,
    };
    matchPattern = {
      ...matchPattern,
      'audience.geoCities.weight': { $gte: selLocation.weight },
    };
  }
  if (filters.audience.fake !== null && filters.audience.fake > 0) {
    matchPattern = {
      ...matchPattern,
      'audience.credibility': { $gte: filters.audience.fake },
    };
  }

  if (filters.influencer.location.length > 0) {
  }

  if (filters.influencer.bio !== '') {
  }

  if (filters.influencer.engagementRate !== null) {
    matchPattern = {
      ...matchPattern,
      'profile.engagementRate': { $gte: filters.influencer.engagementRate },
    };
  }
  if (filters.influencer.followers !== undefined) {
    if (filters.influencer.followers.min > 0) {
      if (filters.influencer.followers.min == '1000000+')
        matchPattern = {
          ...matchPattern,
          'profile.followers': { $gte: 1000000 },
        };
      else
        matchPattern = {
          ...matchPattern,
          'profile.followers': { $gte: filters.influencer.followers.min },
        };
    }
    if (
      filters.influencer.followers.max > 0 &&
      filters.influencer.followers.min != '1000000+'
    ) {
      matchPattern = {
        ...matchPattern,
        'profile.followers': { $lte: filters.influencer.followers.max },
      };
    }
  }
  if (filters.influencer.views !== undefined) {
    if (filters.influencer.views.min > 0) {
      if (filters.influencer.views.min == '1000000+')
        matchPattern = { ...matchPattern, avgViews: { $gte: 1000000 } };
      else
        matchPattern = {
          ...matchPattern,
          avgViews: { $gte: filters.influencer.views.min },
        };
    }
    if (
      filters.influencer.views.max > 0 &&
      filters.influencer.views.min != '1000000+'
    ) {
      matchPattern = {
        ...matchPattern,
        avgViews: { $lte: filters.influencer.views.max },
      };
    }
  }
  if (filters.influencer.gender !== null) {
    matchPattern = { ...matchPattern, gender: filters.influencer.gender };
  }
  if (filters.influencer.hasContactDetails !== false) {
  }
  if (filters.influencer.hasYouTube !== false) {
  }
  if (filters.influencer.type !== null && filters.influencer.type.length > 0) {
  }
  if (filters.influencer.interests && filters.influencer.interests.length > 0) {
    matchPattern = {
      ...matchPattern,
      'interests.id': { $in: filters.influencer.interests },
    };
  }
  if (filters.influencer.language !== null) {
    matchPattern = {
      ...matchPattern,
      'language.code': { $in: filters.influencer.language },
    };
  }
  if (
    filters.influencer.lastposted !== null &&
    filters.influencer.lastposted > 0
  ) {
    const beforeDate = moment()
      .subtract(filters.influencer.lastposted, 'days')
      .format('YYYY-MM-DD');
    matchPattern = {
      ...matchPattern,
      'recentPosts.created': { $gte: beforeDate + 'T00:00:00.000Z' },
    };
  }
  if (filters.influencer.relevance.length > 0) {
    _.map(filters.influencer.relevance, (itm) => {
      if (itm.startsWith('#'))
        matchPattern = { ...matchPattern, 'hashtags.tag': itm.substring(1) };
    });
  }
  if (
    filters.influencer.hashtagengage &&
    filters.influencer.hashtagengage !== null
  ) {
    matchPattern = {
      ...matchPattern,
      'hashtagengage.tag': filters.influencer.hashtagengage,
    };
  }

  return matchPattern;
}

async function getCounts(type, filters) {
  let result = 0;
  let matchPattern = _getMatchPattern(filters);
  try {
    if (type === Constants.snsInstagram)
      result = await Instagram.aggregate([
        { $match: matchPattern },
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);
    else if (type === Constants.snsYoutube)
      result = await Youtube.aggregate([
        { $match: matchPattern },
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);
    else
      result = await Tiktok.aggregate([
        { $match: matchPattern },
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);

    if (result.length > 0) result = result[0].count;
    else result = 0;
  } catch (ex) {
    result = 0;
  }

  return result;
}

async function getInstagram(sort, page, filters) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagements': sort.direction === 'asc' ? 1 : -1 };

  let matchPattern = _getMatchPattern(filters);

  try {
    results = await Instagram.aggregate([
      {
        $match: matchPattern,
      },
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    let popHash = [];
    if (itm.hashtagengage && itm.hashtagengage.length > 0)
      popHash = itm.hashtagengage.splice(
        0,
        itm.hashtagengage.length > 3 ? 3 : itm.hashtagengage.length,
      );
    return { userId: itm.userId, profile: itm.profile, hash: popHash };
  });
  return results;
}

async function getYoutube(sort, page, filters) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagements': sort.direction === 'asc' ? 1 : -1 };

  let matchPattern = _getMatchPattern(filters);

  try {
    results = await Youtube.aggregate([
      {
        $match: matchPattern,
      },
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    return { userId: itm.userId, profile: itm.profile };
  });
  return results;
}

async function getTiktok(sort, page, filters) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagements': sort.direction === 'asc' ? 1 : -1 };

  let matchPattern = _getMatchPattern(filters);

  try {
    results = await Tiktok.aggregate([
      {
        $match: matchPattern,
      },
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    return { userId: itm.userId, profile: itm.profile };
  });
  return results;
}

async function getInfluencerDetail(type, userId) {
  let result = null;
  try {
    if (type === 'instagram')
      result = await Instagram.findOne({ userId: userId });
    else if (type === 'youtube')
      result = await Youtube.findOne({ userId: userId });
    else result = await Tiktok.findOne({ userId: userId });
  } catch (ex) {}
  return result;
}

async function getCountsPerPage(type) {
  let result = 0;
  try {
    if (type === Constants.snsInstagram)
      result = await Instagram.aggregate([
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);
    else if (type === Constants.snsYoutube)
      result = await Youtube.aggregate([
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);
    else
      result = await Tiktok.aggregate([
        { $group: { _id: null, count: { $sum: 1 } } },
        { $project: { _id: 0 } },
      ]);

    if (result.length > 0) result = result[0].count;
    else result = 0;
  } catch (ex) {
    result = 0;
  }

  return result;
}

async function getInstagramPerPage(sort, page) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagement': sort.direction === 'asc' ? 1 : -1 };

  try {
    results = await Instagram.aggregate([
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    let popHash = [];
    if (itm.hashtagengage && itm.hashtagengage.length > 0)
      popHash = itm.hashtagengage.splice(
        0,
        itm.hashtagengage.length > 3 ? 3 : itm.hashtagengage.length,
      );
    return { userId: itm.userId, profile: itm.profile, hash: popHash };
  });
  return results;
}

async function getYoutubePerPage(sort, page) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagement': sort.direction === 'asc' ? 1 : -1 };

  try {
    results = await Youtube.aggregate([
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    return { userId: itm.userId, profile: itm.profile };
  });
  return results;
}

async function getTiktokPerPage(sort, page) {
  let results = [];
  let sortFilters = {};
  if (sort.field === 'followers')
    sortFilters = { 'profile.followers': sort.direction === 'asc' ? 1 : -1 };
  else
    sortFilters = { 'profile.engagement': sort.direction === 'asc' ? 1 : -1 };

  try {
    results = await Tiktok.aggregate([
      {
        $sort: sortFilters,
      },
      {
        $skip: page * 20,
      },
      {
        $limit: 20,
      },
    ]);
  } catch (ex) {
    console.log(ex.toString());
  }

  results = _.map(results, (itm) => {
    return { userId: itm.userId, profile: itm.profile };
  });
  return results;
}

async function saveInstagram(data) {
  // try {
  //   await Instagram.create(
  //     {...data}
  //   );
  // } catch (e) {
  //   return e.toString();
  // };

  try {
    await Instagram.updateOne(
      { userId: data.userId },
      { $set: { ...data } },
      { upsert: true },
    );
  } catch (e) {
    return e.toString();
  }

  return true;
}

async function saveYoutube(data) {
  // try {
  //   await Instagram.create(
  //     {...data}
  //   );
  // } catch (e) {
  //   return e.toString();
  // };
  try {
    // if (data.statHistory && data.statHistory.length > 0) {
    //   data.avgComments =
    //     data.statHistory[data.statHistory.length - 1].avgComments ?? 0;
    //   data.avgLikes =
    //     data.statHistory[data.statHistory.length - 1].avgLikes ?? 0;
    //   data.avgViews =
    //     data.statHistory[data.statHistory.length - 1].avgViews ?? 0;
    // }

    await Youtube.updateOne(
      { userId: data.userId },
      { $set: { ...data } },
      { upsert: true },
    );
  } catch (e) {
    return e.toString();
  }

  return true;
}

async function saveTiktok(data) {
  // try {
  //   await Instagram.create(
  //     {...data}
  //   );
  // } catch (e) {
  //   return e.toString();
  // };

  try {
    // if (data.statHistory && data.statHistory.length > 0) {
    //   data.avgComments =
    //     data.statHistory[data.statHistory.length - 1].avgComments ?? 0;
    //   data.avgLikes =
    //     data.statHistory[data.statHistory.length - 1].avgLikes ?? 0;
    //   data.avgViews =
    //     data.statHistory[data.statHistory.length - 1].avgViews ?? 0;
    // }

    await Tiktok.updateOne(
      { userId: data.userId },
      { $set: { ...data } },
      { upsert: true },
    );
  } catch (e) {
    return e.toString();
  }

  return true;
}

export default ModashRepo;
