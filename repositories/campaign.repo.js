import _ from 'lodash';
import moment from 'moment';
const mongoose = require('mongoose');
const { Campaign, Influencers, Instagram, Youtube, Tiktok } = require('models');
const toObjectId = mongoose.Types.ObjectId;
import Constants from 'constants/constants';
import { apiWrapper } from 'helpers';

import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig();
const baseUrl = `${serverRuntimeConfig.modashUrl}`;

const statusValues = ['社内確認中', '交渉中', 'NG', 'OK'];

const models = {
  [Constants.snsInstagram]: Instagram,
  [Constants.snsYoutube]: Youtube,
  [Constants.snsTiktok]: Tiktok,
};

const CampaignRepo = {
  addNewReportMember,
  addNewReportYoutubeMember,
  addNewReportTiktokMember,
  getCampaignBrief,
  getCampaignList,
  getCSVData,
  getDetailViaList,
  getDetailViaPost,
  getDetailViaRport,
  getCampaignDetailList,
  getAmongCampaignsUsingInfid,
  changeName,
  createCampaign,
  updateCampaign,
  updateCampaignFlag,
  updateMemberAmount,
  updateMemberStatus,
  updateMemberReport,
  updateMemberYoutube,
  updateMemberTiktok,
  setMonitoring,
  getMonitoring,
  updateCampaignInfluencers,
};

async function updateCampaignFlag({ campId, value, type }) {
  try {
    if (type === 'visible') {
      await Campaign.updateOne(
        { _id: toObjectId(campId) },
        { $set: { visible: value } },
      );
    } else {
      await Campaign.updateOne(
        { _id: toObjectId(campId) },
        { $set: { deleted: value } },
      );
    }
  } catch (ex) {
    return false;
  }

  return true;
}

async function getAmongCampaignsUsingInfid(infId) {
  let records = await Campaign.aggregate([
    {
      $match: { 'members.infId': infId },
    },
    {
      $project: { _id: 1 },
    },
  ]).then((response) => {
    return _.map(response, (itm) => itm._id.toString());
  });

  return records;
}

async function getCampaignBrief(campId) {
  let record = await Campaign.findOne({ _id: toObjectId(campId) });
  return record;
}

async function getCSVData(campId, type) {
  const params = [
    {
      $match: { _id: toObjectId(campId) },
    },
    {
      $unwind: { path: '$members' },
    },
    {
      $sort: { 'members.followers': -1 },
    },
  ];

  let datas = await Campaign.aggregate(params);

  datas = datas.map((itm) => {
    return { _id: itm.members.infId, status: itm.members.status };
  });

  datas = datas.reduce((unique, o) => {
    if (!unique.some((obj) => obj._id === o._id)) {
      unique.push(o);
    }
    return unique;
  }, []);

  let influencerData = await models[type].find({
    userId: { $in: datas.map((itm) => itm._id) },
  });

  influencerData = influencerData.reduce((unique, o) => {
    if (!unique.some((obj) => obj.userId === o.userId)) {
      unique.push(o);
    }
    return unique;
  }, []);

  const influencerMap = influencerData.reduce(
    (map, b) => map.set(b.userId.toString(), b),
    new Map(),
  );

  for (const data of datas) {
    data.detail = influencerMap.get(data._id.toString());
  }

  let results = [];

  if (type === Constants.snsInstagram) {
    results = _.map(datas, (itm) => {
      if (Array.isArray(itm.detail) && itm.detail.length < 1) {
        return;
      }
      const detail = Array.isArray(itm.detail) ? itm.detail[0] : itm.detail;
      let male = 0,
        female = 0;
      for (let gender of detail.audience?.genders ?? []) {
        if (gender.code == 'MALE') male = gender.weight * 100;
        if (gender.code == 'FEMALE') female = gender.weight * 100;
      }

      let [m13, m18, m25, m35, m45, f13, f18, f25, f35, f45] = Array(10).fill(
        0,
      );

      for (let _itm of detail.audience?.gendersPerAge ?? []) {
        if (_itm.code == '13-17') {
          f13 = _itm.female * 100;
          m13 = _itm.male * 100;
        }
        if (_itm.code == '18-24') {
          m18 = _itm.male * 100;
          f18 = _itm.female * 100;
        }
        if (_itm.code == '25-34') {
          m25 = _itm.male * 100;
          f25 = _itm.female * 100;
        }
        if (_itm.code == '35-44') {
          m35 = _itm.male * 100;
          f35 = _itm.female * 100;
        }
        if (_itm.code == '45-64') {
          m45 = _itm.male * 100;
          f45 = _itm.female * 100;
        }
      }

      let tc = [];
      for (let idx = 0; idx < 3; idx++) {
        tc[idx] =
          '"' +
          (detail.audience?.geoCountries?.[idx]?.name ?? '') +
          '=' +
          ((detail.audience?.geoCountries?.[idx]?.weight ?? 0) * 100).toFixed(
            2,
          ) +
          '%"';
      }

      if (!detail.hashtagengage || detail.hashtagengage.length < 1) {
        let hashtagEngage = [];
        _.map(detail.popularPosts, (itm) => {
          let likes = itm.likes ?? 0;
          let comments = itm.comments ?? 0;
          let followers = detail.profile.followers ?? 0;

          let weight =
            followers > 0 ? ((likes + comments) / followers) * 100 : 0;
          _.map(itm.hashtags, (tag) => {
            let isExists = _.findIndex(
              hashtagEngage,
              (engage) => engage.tag === tag,
            );
            if (weight < 0.01) return;

            if (isExists === -1) {
              hashtagEngage.push({ tag: tag, weight: weight });
            } else {
              if (weight < hashtagEngage[isExists].weight) return;

              hashtagEngage[isExists].weight = weight;
            }
          });
        });

        detail.hashtagengage = hashtagEngage;
      }

      let eg = [],
        ti = [],
        br = [];
      for (let idx = 0; idx < 5; idx++) {
        eg[idx] =
          '"' +
          (detail.hashtagengage?.[idx]?.tag ?? '') +
          '=' +
          (detail.hashtagengage?.[idx]?.weight ?? 0).toFixed(2) +
          '%"';
        ti[idx] =
          '"' +
          (detail.audience?.interests?.[idx]?.name ?? '') +
          '=' +
          ((detail.audience?.interests?.[idx]?.weight ?? 0) * 100).toFixed(2) +
          '%"';
        br[idx] =
          '"' +
          (detail.audience?.brandAffinity?.[idx]?.name ?? '') +
          '=' +
          ((detail.audience?.brandAffinity?.[idx]?.weight ?? 0) * 100).toFixed(
            2,
          ) +
          '%"';
      }

      let cred = ((detail.audience?.credibility ?? 0) * 100).toFixed(2);
      let likersCred = (
        (detail.audienceLikers?.credibility ?? 0) * 100
      ).toFixed(2);

      let contactInfo = '';
      detail.contacts &&
        detail.contacts.forEach((element) => {
          if (element.type == 'email') {
            contactInfo = element.value;
          }
        });

      return {
        c1: '@' + detail.profile.username,
        c2: detail.country ?? '',
        c3: detail.profile.fullname ?? '',
        c4: detail.profile.url ?? '',
        c5: detail.profile.followers ?? 0,
        c6: ((detail.profile.engagementRate ?? 0) * 100).toFixed(2) + '%',
        c7: male.toFixed(2) + '%',
        c8: female.toFixed(2) + '%',
        c9: m13.toFixed(2) + '%',
        c10: m18.toFixed(2) + '%',
        c11: m25.toFixed(2) + '%',
        c12: m35.toFixed(2) + '%',
        c13: m45.toFixed(2) + '%',
        c14: f13.toFixed(2) + '%',
        c15: f18.toFixed(2) + '%',
        c16: f25.toFixed(2) + '%',
        c17: f35.toFixed(2) + '%',
        c18: f45.toFixed(2) + '%',
        c19: tc[0],
        c20: tc[1],
        c21: tc[2],
        c22: eg[0],
        c23: eg[1],
        c24: eg[2],
        c25: eg[3],
        c26: eg[4],
        c27: ti[0],
        c28: ti[1],
        c29: ti[2],
        c30: ti[3],
        c31: ti[4],
        c32: br[0],
        c33: br[1],
        c34: br[2],
        c35: br[3],
        c36: br[4],
        c37: cred + '%',
        c38: detail.avgLikes ?? 0,
        c39: detail.avgComments ?? 0,
        c40:
          ((detail.audienceLikers.nonFollowerLikes ?? 0) * 100).toFixed(2) +
          '%',
        c41: likersCred + '%',
        c42: contactInfo,
        c43: statusValues[itm.status - 1],
      };
    });
  } else if (type === Constants.snsYoutube) {
    results = _.map(datas, (itm) => {
      if (Array.isArray(itm.detail) && itm.detail.length < 1) {
        return;
      }
      const detail = Array.isArray(itm.detail) ? itm.detail[0] : itm.detail;
      let male = 0,
        female = 0;
      for (let _itm of detail.audience?.genders ?? []) {
        if (_itm.code == 'MALE') male = _itm.weight * 100;
        if (_itm.code == 'FEMALE') female = _itm.weight * 100;
      }

      let [m13, m18, m25, m35, m45, f13, f18, f25, f35, f45] = Array(10).fill(
        0,
      );

      for (let _itm of detail.audience?.gendersPerAge ?? []) {
        if (_itm.code == '13-17') {
          f13 = _itm.female * 100;
          m13 = _itm.male * 100;
        }
        if (_itm.code == '18-24') {
          m18 = _itm.male * 100;
          f18 = _itm.female * 100;
        }
        if (_itm.code == '25-34') {
          m25 = _itm.male * 100;
          f25 = _itm.female * 100;
        }
        if (_itm.code == '35-44') {
          m35 = _itm.male * 100;
          f35 = _itm.female * 100;
        }
        if (_itm.code == '45-64') {
          m45 = _itm.male * 100;
          f45 = _itm.female * 100;
        }
      }

      let tc = [];
      for (let idx = 0; idx < 3; idx++) {
        tc[idx] =
          '"' +
          (detail.audience?.geoCountries?.[idx]?.name ?? '') +
          '=' +
          ((detail.audience?.geoCountries?.[idx]?.weight ?? 0) * 100).toFixed(
            2,
          ) +
          '%"';
      }

      let notable = ((detail.audience?.notable ?? 0) * 100).toFixed(2);

      let contactInfo = '';
      (detail.contacts ?? []).forEach((element) => {
        if (element.type == 'email') {
          contactInfo = element.value;
        }
      });

      return {
        c1: '@' + detail.profile.username,
        c2: detail.userId,
        c3: detail.country ?? '',
        c4: 'https://www.youtube.com/channel/' + detail.userId,
        c5: detail.profile.fullname ?? '',
        c6: detail.profile.followers ?? 0,
        c7: ((detail.profile.engagementRate ?? 0) * 100).toFixed(2) + '%',
        c8: male.toFixed(2) + '%',
        c9: female.toFixed(2) + '%',
        c10: m13.toFixed(2) + '%',
        c11: m18.toFixed(2) + '%',
        c12: m25.toFixed(2) + '%',
        c13: m35.toFixed(2) + '%',
        c14: m45.toFixed(2) + '%',
        c15: f13.toFixed(2) + '%',
        c16: f18.toFixed(2) + '%',
        c17: f25.toFixed(2) + '%',
        c18: f35.toFixed(2) + '%',
        c19: f45.toFixed(2) + '%',
        c20: tc[0],
        c21: tc[1],
        c22: tc[2],
        c23: notable + '%',
        c24: detail.avgLikes ?? 0,
        c25: 0,
        c26: detail.avgViews ?? 0,
        c27: detail.avgComments ?? 0,
        c28: contactInfo,
        c29: statusValues[itm.status - 1],
      };
    });
  } else if (type === Constants.snsTiktok) {
    results = _.map(datas, (itm) => {
      if (Array.isArray(itm.detail) && itm.detail.length < 1) {
        return;
      }
      const detail = Array.isArray(itm.detail) ? itm.detail[0] : itm.detail;

      let male = 0,
        female = 0;
      for (let _itm of detail.audience?.genders ?? []) {
        if (_itm.code == 'MALE') male = _itm.weight * 100;
        if (_itm.code == 'FEMALE') female = _itm.weight * 100;
      }

      let [m13, m18, m25, m35, m45, f13, f18, f25, f35, f45] = Array(10).fill(
        0,
      );

      for (let _itm of detail.audience?.gendersPerAge ?? []) {
        if (_itm.code == '13-17') {
          f13 = _itm.female * 100;
          m13 = _itm.male * 100;
        }
        if (_itm.code == '18-24') {
          m18 = _itm.male * 100;
          f18 = _itm.female * 100;
        }
        if (_itm.code == '25-34') {
          m25 = _itm.male * 100;
          f25 = _itm.female * 100;
        }
        if (_itm.code == '35-44') {
          m35 = _itm.male * 100;
          f35 = _itm.female * 100;
        }
        if (_itm.code == '45-64') {
          m45 = _itm.male * 100;
          f45 = _itm.female * 100;
        }
      }

      let tc = [];
      for (let idx = 0; idx < 3; idx++) {
        tc[idx] =
          '"' +
          (detail.audience?.geoCountries?.[idx]?.name ?? '') +
          '=' +
          ((detail.audience?.geoCountries?.[idx]?.weight ?? 0) * 100).toFixed(
            2,
          ) +
          '%"';
      }

      let notable = ((detail.audience?.notable ?? 0) * 100).toFixed(2);

      let contactInfo = '',
        igUrl = '';
      (detail.contacts ?? []).forEach((element) => {
        if (element.type == 'email') {
          contactInfo = element.value;
        } else if (element.type == 'instagram') {
          igUrl = element.value;
        }
      });

      return {
        c1: '@' + detail.profile.username,
        c2: detail.country ?? '',
        c3: detail.profile.fullname ?? '',
        c4: 'https://www.tiktok.com/@' + detail.profile.username,
        c5: detail.profile.followers ?? 0,
        c6: ((detail.profile.engagementRate ?? 0) * 100).toFixed(2) + '%',
        c7: male.toFixed(2) + '%',
        c8: female.toFixed(2) + '%',
        c9: m13.toFixed(2) + '%',
        c10: m18.toFixed(2) + '%',
        c11: m25.toFixed(2) + '%',
        c12: m35.toFixed(2) + '%',
        c13: m45.toFixed(2) + '%',
        c14: f13.toFixed(2) + '%',
        c15: f18.toFixed(2) + '%',
        c16: f25.toFixed(2) + '%',
        c17: f35.toFixed(2) + '%',
        c18: f45.toFixed(2) + '%',
        c19: tc[0],
        c20: tc[1],
        c21: tc[2],
        c22: notable + '%',
        c23: detail.avgLikes ?? 0,
        c24: detail.avgViews ?? 0,
        c25: detail.avgComments ?? 0,
        c26: contactInfo,
        c27: detail.profile.url ?? igUrl,
        c28: statusValues[itm.status - 1],
      };
    });
  }

  return results;
}

async function changeName(userId, campId, name) {
  const existCamp = await Campaign.findOne({
    userId: toObjectId(userId),
    name,
  });
  if (existCamp?._id?.toString() !== campId) return -1;

  try {
    await Campaign.updateOne({ _id: toObjectId(campId) }, { $set: { name } });
  } catch (ex) {
    return -2;
  }

  return 0;
}

async function createCampaign(userId, name, sns, type, list) {
  const existCamp = await Campaign.findOne({
    userId: toObjectId(userId),
    name,
  });
  if (existCamp) return -1;

  let newCamp = await Campaign.create({
    userId: toObjectId(userId),
    name,
    sns,
    type,
    list,
  });

  return newCamp._id.toString();
}

async function updateCampaign(userId, cmpId, name, sns, type, list) {
  try {
    await Campaign.updateOne(
      {
        _id: toObjectId(cmpId),
      },
      {
        $set: { name, sns, type, list },
      },
      { new: true, upsert: true },
    );
    return cmpId;
  } catch (error) {
    console.log('updateCampaign', error);
    return -1;
  }
}

async function getDetailViaList(campId, page = 1) {
  let params = [
    {
      $match: { _id: toObjectId(campId) },
    },
    {
      $unwind: { path: '$members' },
    },
    {
      $lookup: {
        from: 'influencers',
        localField: '62de97f04689f3000af8a048',
        foreignField: '_id',
        as: 'inf_doc',
      },
    },
    {
      $unwind: {
        path: '$inf_doc',
      },
    },
    {
      $project: {
        name: 1,
        members: 1,
        tags: '$inf_doc.tags',
      },
    },
    {
      $group: {
        _id: '$members.infId',
        doc: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: { newRoot: '$doc' },
    },
    { $sort: { 'members.followers': -1 } },
  ];

  if (page === 1) {
    params = [
      ...params,
      {
        $limit: 50,
      },
    ];
  }

  if (page > 1) {
    params = [
      ...params,
      {
        $skip: (page - 1) * 50,
      },
      {
        $limit: 50,
      },
    ];
  }

  const records = await Campaign.aggregate(params, { allowDiskUse: true });

  if (!records || records.length == 0) return null;

  let influencerData;
  let userIdList = records.map((record) => record.members.infId);
  userIdList = userIdList.reduce((unique, o) => {
    if (!unique.some((obj) => obj === o)) {
      unique.push(o);
    }
    return unique;
  }, []);

  const memberMap = records.reduce(
    (map, record) => map.set(record.members.infId.toString(), record),
    new Map(),
  );

  influencerData = await models[records[0].members.type]
    .find({
      userId: { $in: userIdList },
    })
    .select(
      page == -1
        ? 'profile.followers userId -_id'
        : 'profile.followers userId -_id profile.engagementRate profile.fullname',
    );

  const influencerMap = influencerData.reduce(
    (map, b) => map.set(b.userId.toString(), b),
    new Map(),
  );

  let result = userIdList.map((id) => {
    return {
      ...memberMap.get(id).members,
      tags: memberMap.get(id).tags,
      detail_doc: { profile: influencerMap.get(id).profile },
    };
  });

  return {
    name: records[0].name,
    members: result.filter((itm) => itm.infName || itm.name),
  };
}

async function getDetailViaPost(campId) {
  const records = await Campaign.aggregate([
    {
      $match: { _id: toObjectId(campId) },
    },
    {
      $unwind: { path: '$members' },
    },
    {
      $lookup: {
        from: 'influencers',
        localField: 'members.accountId',
        foreignField: '_id',
        as: 'inf_doc',
      },
    },
    {
      $unwind: {
        path: '$inf_doc',
      },
    },
    {
      $match: {
        'members.step': { $gt: 1 },
      },
    },
    {
      $project: {
        name: 1,
        members: 1,
        tags: '$inf_doc.tags',
        isMonitoring: '$monitoring.isSet',
      },
    },
  ]);
  if (!(records?.length > 0)) return null;

  let result = Array.from(new Set(records.map((x) => x.members.infId))).map(
    (id) => {
      const findItm = records.find((s) => s.members.infId === id);
      return { ...findItm.members, tags: findItm.tags };
    },
  );
  return {
    name: records[0].name,
    members: result,
    isMonitoring: records[0].isMonitoring,
  };
}

async function getDetailViaRport(campId) {
  const campInfo = await Campaign.aggregate([
    {
      $match: { _id: toObjectId(campId) },
    },
    {
      $project: {
        name: 1,
        members: {
          $filter: {
            input: '$members',
            as: 'item',
            cond: { $eq: ['$$item.step', 3] },
          },
        },
      },
    },
  ]);

  if (campInfo?.length > 0) return campInfo[0];

  return null;
}

async function getCampaignDetailList(userId) {
  let list = await Campaign.aggregate([
    {
      $match: { userId: toObjectId(userId), deleted: { $ne: true } },
    },
  ]);

  let result = [];
  _.map(list, (itm) => {
    let amount = 0,
      members = 0,
      rich = 0,
      inp = 0,
      recycle = 0,
      sell = 0,
      prs = 0,
      followers = 0,
      richper = 0,
      inpper = 0,
      prper = 0;
    let trich = 0,
      tfollower = 0,
      tinp = 0,
      tpr = 0;

    let memInfIdList = itm.members.map((x) => x.infId);
    memInfIdList = memInfIdList.reduce((unique, o) => {
      if (!unique.some((obj) => obj === o)) {
        unique.push(o);
      }
      return unique;
    }, []);

    const memMap = itm.members.reduce(
      (map, b) => map.set(b.infId.toString(), b),
      new Map(),
    );

    let distinctMems = memInfIdList.map((id) => {
      trich = +memMap.get(id).rich;
      tinp = +memMap.get(id).inp;
      tfollower = +memMap.get(id).followers;
      tpr = +memMap.get(id).prs;

      followers += tfollower;
      amount += +memMap.get(id).amount;
      rich += trich;
      inp += tinp;
      recycle += +memMap.get(id).prs;
      sell += +memMap.get(id).sell;

      // richper += (!tfollower || !trich) ? 0 : trich / tfollower;
      inpper += !tfollower || !tinp ? 0 : tinp / tfollower;
      prper += !tfollower || !tpr ? 0 : tpr / tfollower;
    });
    richper = !followers ? 0 : (rich + inp) / followers;
    members = distinctMems.length;

    result.push({
      id: itm._id.toString(),
      name: itm.name,
      sns: itm.sns,
      genre: itm.type,
      list: itm.list ?? '',
      mems: members,
      followers: followers,
      amount: amount,
      rich: itm.sns === Constants.snsInstagram ? rich + inp : recycle,
      richper:
        itm.sns === Constants.snsInstagram
          ? (richper * 100).toFixed(1)
          : (members > 0 ? (prper / members) * 100 : 0).toFixed(1),
      sell: sell,
      roas: amount > 0 ? ((sell / amount) * 100).toFixed(1) : 0,
      cdate: moment(itm.createdAt).format('YYYY/MM/DD'),
      edate: '',
      visible: itm.visible ?? true,
      deleted: itm.deleted ?? false,
    });
  });

  return result;
}

async function getCampaignList(userId) {
  let list = await Campaign.aggregate([
    {
      $match: { userId: toObjectId(userId) },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        sns: 1,
        type: 1,
        members: 1,
        visible: 1,
        deleted: 1,
      },
    },
  ]);

  list.forEach((a) => {
    a.mems = a.members?.length ?? 0;
    delete a.members;
  });

  return list;
}

async function updateMemberAmount({ campId, memId, accId, amount }) {
  try {
    await Campaign.updateOne(
      { _id: toObjectId(campId), 'members._id': toObjectId(memId) },
      { $set: { 'members.$.amount': amount } },
    );

    await Influencers.updateOne(
      { _id: toObjectId(accId) },
      { $set: { amount } },
    );
  } catch (ex) {
    console.error(ex);
  }
}

async function updateMemberStatus(campId, step, memId, status) {
  if (step === 1) {
    if (status === 4) {
      await Campaign.updateOne(
        { _id: toObjectId(campId), 'members._id': toObjectId(memId) },
        {
          $set: {
            'members.$.step': 2,
            'members.$.status': status,
            'members.$.pstatus': 1,
          },
        },
      );
    } else {
      await Campaign.updateOne(
        { _id: toObjectId(campId), 'members._id': toObjectId(memId) },
        { $set: { 'members.$.step': 1, 'members.$.status': status } },
      );
    }
  } else if (step === 2) {
    if (status === 6) {
      await Campaign.updateOne(
        { _id: toObjectId(campId), 'members._id': toObjectId(memId) },
        {
          $set: {
            'members.$.step': 3,
            'members.$.pstatus': status,
            'members.$.rtype': 0,
          },
        },
      );
    } else {
      await Campaign.updateOne(
        { _id: toObjectId(campId), 'members._id': toObjectId(memId) },
        { $set: { 'members.$.step': 2, 'members.$.pstatus': status } },
      );
    }
  }
}

async function addNewReportMember(campId, memId, rtype) {
  let oldMem = await Campaign.aggregate([
    {
      $match: {
        _id: toObjectId(campId),
      },
    },
    {
      $unwind: {
        path: '$members',
      },
    },
    {
      $match: {
        'members._id': toObjectId(memId),
      },
    },
    {
      $project: {
        members: 1,
      },
    },
  ]);

  let temp = {};
  _.map(oldMem?.[0].members, (val, key) => {
    if (key === '_id') return;
    temp[key] =
      key === 'accountId'
        ? toObjectId(val)
        : key === 'postAt'
        ? moment(val).format('YYYY-MM-DD')
        : val;
  });
  temp.rtype = 0; // TODO rtype?
  const pMemo = temp.memo ?? '';
  temp.memo = memId;

  let result = '';
  try {
    result = await Campaign.updateOne(
      { _id: toObjectId(campId) },
      { $addToSet: { members: temp } },
    );

    let newMem = await Campaign.aggregate([
      { $match: { _id: toObjectId(campId) } },
      { $unwind: { path: '$members' } },
      { $match: { 'members.memo': memId } },
      { $project: { members: 1 } },
    ]);

    result = newMem[0]._id.toString();

    await Campaign.updateOne(
      { _id: toObjectId(campId), 'members._id': newMem._id },
      { $set: { 'members.$.memo': pMemo } },
    );
  } catch (ex) {
    result = '';
  }

  return result;
}

async function addNewReportYoutubeMember(campId, memId) {
  let oldMem = await Campaign.aggregate([
    {
      $match: {
        _id: toObjectId(campId),
      },
    },
    {
      $unwind: {
        path: '$members',
      },
    },
    {
      $match: {
        'members._id': toObjectId(memId),
      },
    },
    {
      $project: {
        members: 1,
      },
    },
  ]);

  let temp = {};
  _.map(oldMem?.[0].members, (val, key) => {
    if (key === '_id') return;

    temp[key] =
      key === 'accountId'
        ? toObjectId(val)
        : key === 'postAt'
        ? moment(val).format('YYYY-MM-DD')
        : val;
  });
  let pMemo = temp.memo ?? '';
  temp.memo = memId;

  let result = '';
  try {
    result = await Campaign.updateOne(
      { _id: toObjectId(campId) },
      { $addToSet: { members: temp } },
    );

    let newMem = await Campaign.aggregate([
      { $match: { _id: toObjectId(campId) } },
      { $unwind: { path: '$members' } },
      { $match: { 'members.memo': memId } },
      { $project: { members: 1 } },
    ]);

    result = newMem[0]._id.toString();

    await Campaign.updateOne(
      { _id: toObjectId(campId), 'members._id': newMem._id },
      { $set: { 'members.$.memo': pMemo } },
    );
  } catch (ex) {
    result = '';
  }

  return result;
}

async function addNewReportTiktokMember(campId, memId) {
  let oldMem = await Campaign.aggregate([
    {
      $match: {
        _id: toObjectId(campId),
      },
    },
    {
      $unwind: {
        path: '$members',
      },
    },
    {
      $match: {
        'members._id': toObjectId(memId),
      },
    },
    {
      $project: {
        members: 1,
      },
    },
  ]);

  let temp = {};
  _.map(oldMem?.[0].members, (val, key) => {
    if (key === '_id') return;

    temp[key] =
      key === 'accountId'
        ? toObjectId(val)
        : key === 'postAt'
        ? moment(val).format('YYYY-MM-DD')
        : val;
  });
  let pMemo = temp.memo ?? '';
  temp.memo = memId;

  let result = '';
  try {
    result = await Campaign.updateOne(
      { _id: toObjectId(campId) },
      { $addToSet: { members: temp } },
    );

    let newMem = await Campaign.aggregate([
      { $match: { _id: toObjectId(campId) } },
      { $unwind: { path: '$members' } },
      { $match: { 'members.memo': memId } },
      { $project: { members: 1 } },
    ]);

    result = newMem[0]._id.toString();

    await Campaign.updateOne(
      { _id: toObjectId(campId), 'members._id': newMem._id },
      { $set: { 'members.$.memo': pMemo } },
    );
  } catch (ex) {
    result = '';
  }

  return result;
}

async function updateMemberReport(campId, datas) {
  try {
    for (let _itm of datas) {
      if (_itm._id < 0) {
        // add new member
        let temp = {};
        _.map(_itm, (val, key) => {
          if (key === '_id') return;

          temp[key] =
            key === 'accountId'
              ? toObjectId(val)
              : key === 'postAt'
              ? moment(val).format('YYYY-MM-DD')
              : val;
        });

        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $addToSet: { members: temp } },
        );
      } else if (_itm.deleted === true) {
        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $pull: { members: { _id: toObjectId(_itm._id) } } },
        );
      } else if (_itm.rtype === 1) {
        await Campaign.updateOne(
          {
            _id: toObjectId(campId),
            'members._id': toObjectId(_itm._id),
          },
          {
            $set: {
              'members.$.rtype': 1,
              'members.$.postAt': _itm.postAt,
              'members.$.postLink': _itm.postLink,
              'members.$.shopping': _itm.shopping,
              'members.$.rich': _itm.rich,
              'members.$.oks': _itm.oks,
              'members.$.comment': _itm.comment,
              'members.$.sell': _itm.sell,
              'members.$.saving': _itm.saving,
            },
          },
        );

        await Influencers.updateOne(
          { _id: toObjectId(_itm.accountId) },
          {
            $set: {
              rstatus: 1,
              postAt: _itm.postAt,
              postLink: _itm.postLink,
              shopping: _itm.shopping,
              rich: _itm.rich,
              oks: _itm.oks,
              comment: _itm.comment,
              sell: _itm.sell,
              saving: _itm.saving,
            },
          },
        );
      } else if (_itm.rtype === 2) {
        await Campaign.updateOne(
          {
            _id: toObjectId(campId),
            'members._id': toObjectId(_itm._id),
          },
          {
            $set: {
              rstatus: 2,
              'members.$.rtype': 2,
              'members.$.postAt': _itm.postAt,
              'members.$.postLink': _itm.postLink,
              'members.$.shopping': _itm.shopping,
              'members.$.inp': _itm.inp,
              'members.$.click': _itm.click,
              'members.$.stamp': _itm.stamp,
              'members.$.sell': _itm.sell,
            },
          },
        );
        await Influencers.updateOne(
          { _id: toObjectId(_itm.accountId) },
          {
            $set: {
              rstatus: 3,
              postAt: _itm.postAt,
              postLink: _itm.postLink,
              shopping: _itm.shopping,
              inp: _itm.inp,
              click: _itm.click,
              stamp: _itm.stamp,
              sell: _itm.sell,
            },
          },
        );
      } else if (_itm.rtype === 3) {
        await Campaign.updateOne(
          {
            _id: toObjectId(campId),
            'members._id': toObjectId(_itm._id),
          },
          {
            $set: {
              'members.$.rtype': 3,
              'members.$.postAt': _itm.postAt,
              'members.$.postLink': _itm.postLink,
              'members.$.shopping': _itm.shopping,
              'members.$.rich': _itm.rich,
              'members.$.saving': _itm.saving,
              'members.$.oks': _itm.oks,
              'members.$.comment': _itm.comment,
              'members.$.sell': _itm.sell,
            },
          },
        );
        await Influencers.updateOne(
          { _id: toObjectId(_itm.accountId) },
          {
            $set: {
              postAt: _itm.postAt,
              postLink: _itm.postLink,
              shopping: _itm.shopping,
              rich: _itm.rich,
              saving: _itm.saving,
              oks: _itm.oks,
              comment: _itm.comment,
              sell: _itm.sell,
            },
          },
        );
      }
    }
  } catch (ex) {
    console.log(ex.toString());
  }
}

async function updateMemberYoutube(campId, datas) {
  try {
    for (let _itm of datas) {
      if (_itm._id < 0) {
        // add new member
        let temp = {};
        _.map(_itm, (val, key) => {
          if (key === '_id') return;

          temp[key] =
            key === 'accountId'
              ? toObjectId(val)
              : key === 'postAt'
              ? moment(val).format('YYYY-MM-DD')
              : val;
        });

        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $addToSet: { members: temp } },
        );
      } else if (_itm.deleted === true) {
        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $pull: { members: { _id: toObjectId(_itm._id) } } },
        );
      } else {
        await Campaign.updateOne(
          {
            _id: toObjectId(campId),
            'members._id': toObjectId(_itm._id),
          },
          {
            $set: {
              'members.$.postAt': _itm.postAt,
              'members.$.postLink': _itm.postLink,
              'members.$.shopping': _itm.shopping,
              'members.$.prs': _itm.prs,
              'members.$.oks': _itm.oks,
              'members.$.bad': _itm.bad,
              'members.$.comment': _itm.comment,
              'members.$.click': _itm.click,
              'members.$.cv': _itm.cv,
              'members.$.sell': _itm.sell,
            },
          },
        );

        await Influencers.updateOne(
          { _id: toObjectId(_itm.accountId) },
          {
            $set: {
              postAt: _itm.postAt,
              postLink: _itm.postLink,
              shopping: _itm.shopping,
              prs: _itm.prs,
              oks: _itm.oks,
              bad: _itm.bad,
              comment: _itm.comment,
              click: _itm.click,
              cv: _itm.cv,
              sell: _itm.sell,
            },
          },
        );
      }
    }
  } catch (ex) {
    console.log(ex.toString());
  }
}

async function updateMemberTiktok(campId, datas) {
  try {
    for (let _itm of datas) {
      if (_itm._id < 0) {
        // add new member
        let temp = {};
        _.map(_itm, (val, key) => {
          if (key === '_id') return;

          temp[key] =
            key === 'accountId'
              ? toObjectId(val)
              : key === 'postAt'
              ? moment(val).format('YYYY-MM-DD')
              : val;
        });

        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $addToSet: { members: temp } },
        );
      } else if (_itm.deleted === true) {
        await Campaign.updateOne(
          { _id: toObjectId(campId) },
          { $pull: { members: { _id: toObjectId(_itm._id) } } },
        );
      } else {
        await Campaign.updateOne(
          {
            _id: toObjectId(campId),
            'members._id': toObjectId(_itm._id),
          },
          {
            $set: {
              'members.$.postAt': _itm.postAt,
              'members.$.postLink': _itm.postLink,
              'members.$.shopping': _itm.shopping,
              'members.$.prs': _itm.prs,
              'members.$.oks': _itm.oks,
              'members.$.comment': _itm.comment,
              'members.$.sell': _itm.sell,
              'members.$.share': _itm.share,
            },
          },
        );

        await Influencers.updateOne(
          { _id: toObjectId(_itm.accountId) },
          {
            $set: {
              postAt: _itm.postAt,
              postLink: _itm.postLink,
              shopping: _itm.shopping,
              prs: _itm.prs,
              oks: _itm.oks,
              bad: _itm.bad,
              comment: _itm.comment,
              sell: _itm.sell,
              share: _itm.share,
            },
          },
        );
      }
    }
  } catch (ex) {
    console.error({ ex });
  }
}

async function getMonitoring(campId) {
  try {
    let record = await Campaign.findOne({ _id: toObjectId(campId) });
    return record.monitoring;
  } catch (error) {
    console.error({ error });
    return false;
  }
}

async function setMonitoring(campId, data) {
  try {
    data.isSet = true;
    await Campaign.updateOne(
      { _id: toObjectId(campId) },
      { $set: { monitoring: data } },
      { new: true, upsert: true },
    );
    return true;
  } catch (error) {
    console.error({ error });
    return false;
  }
}

async function updateCampaignInfluencers(campId, type) {
  const params = [
    {
      $match: { _id: toObjectId(campId) },
    },
    {
      $unwind: { path: '$members' },
    },
    {
      $sort: { 'members.followers': -1 },
    },
  ];

  let datas = await Campaign.aggregate(params);

  datas = datas.map((itm) => {
    return { _id: itm.members.infId, status: itm.members.status };
  });

  datas = datas.reduce((unique, o) => {
    if (!unique.some((obj) => obj._id === o._id)) {
      unique.push(o);
    }
    return unique;
  }, []);

  for (const itm of datas) {
    await delay(itm._id, type);
  }

  return true;
}

const fetchReport = async (url) => {
  let dataFromModash = await apiWrapper.get(url).catch((e) => {
    console.log({ url, e });
  });

  return dataFromModash?.profile ?? {};
};

const delay = async (id, type) => {
  let modashReport = await fetchReport(
    `${baseUrl}/${type}/profile/${id}/report`,
  );

  if (type == Constants.snsInstagram) {
    let hashtagengage = [];

    _.map(modashReport.popularPosts, (itm) => {
      let likes = itm.likes ?? 0;
      let comments = itm.comments ?? 0;
      let followers = modashReport.profile.followers ?? 0;

      let weight = followers > 0 ? ((likes + comments) / followers) * 100 : 0;
      _.map(itm.hashtags, (tag) => {
        let isExists = _.findIndex(
          hashtagengage,
          (engage) => engage.tag === tag,
        );
        if (weight < 0.01) return;

        if (isExists === -1) {
          hashtagengage.push({ tag, weight });
        } else {
          if (weight < hashtagengage[isExists].weight) return;

          hashtagengage[isExists].weight = weight;
        }
      });
    });

    modashReport.hashtagengage = hashtagengage;
  }

  const collection =
    type == Constants.snsInstagram
      ? Instagram
      : type == Constants.snsYoutube
      ? Youtube
      : Tiktok;
  await collection
    .updateOne(
      {
        userId: id,
      },
      {
        $set: {
          ...modashReport,
          lastUpdated: moment().format('YYYY-MM-DD'),
        },
      },
      {
        new: true,
        upsert: true,
      },
    )
    .catch((e) => console.log({ e }));
  Promise.resolve();
};

export default CampaignRepo;
