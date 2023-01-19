import moment from 'moment';
const mongoose = require('mongoose');
const { Keys, User, Usage, History, Plans } = require('models');
const toObjectId = mongoose.Types.ObjectId;
import { HistoryRepo } from 'repositories';

const UsageRepo = {
  closeCustom,
  getHistory,
  getPlanUsage,
  getPlanFromCustom,
  getCurrentUsage,
  savePlan2Custom,
  switchPlan2Custom,
  switchPlan,
  ChangeUser2Free,
  updateCustomAmount,
  updatePayStatus,
  updateUsage,
  updateUsageToEmpty,
};

async function updateUsageToEmpty(userId, usage) {
  let curDate = moment().format('YYYY-MM-DD');

  // not custom period
  if (usage.plantype !== 'カスタム') {
    if (moment(usage.historyend).format('YYYY-MM-DD') < curDate)
      return usage.monthend;

    if (usage.monthend)
      usage.monthend = moment(usage.monthend)
        .add(1, 'months')
        .format('YYYY-MM-DD');
    else
      usage.monthend = moment()
        .add(1, 'months')
        .format('YYYY-MM-DD');

    await Usage.updateOne(
      { userId: userId, 'history._id': usage._id },
      {
        $set: {
          'history.$.monthend': usage.monthend,
          'history.$.pagesuse': 0,
          'history.$.profiesuse': 0,
          'history.$.csvuse': 0,
          'history.$.reportsuse': 0,
          'history.$.savesuse': 0,
        },
      },
    );

    return usage.monthend;
  }

  if (usage.updatemode) {
    if (usage.monthend)
      usage.historydate = moment(usage.monthend)
        .add(1, 'days')
        .format('YYYY/MM/DD');
    else
      usage.historydate = moment()
        .add(1, 'days')
        .format('YYYY/MM/DD');

    usage.historyend = moment(usage.historydate)
      .add(1, 'months')
      .format('YYYY/MM/DD');
    usage.monthend = usage.historyend;
  } else {
    usage.monthend = moment(usage.historyend).format('YYYY-MM-DD');
  }

  await Usage.updateOne(
    { userId: userId, 'history._id': usage._id },
    {
      $set: {
        'history.$.historydate': usage.historydate,
        'history.$.historyend': usage.historyend,
        'history.$.monthend': usage.monthend,
        'history.$.pagesuse': 0,
        'history.$.profiesuse': 0,
        'history.$.csvuse': 0,
        'history.$.reportsuse': 0,
        'history.$.savesuse': 0,
      },
    },
  );

  await User.updateOne(
    { _id: toObjectId(userId) },
    {
      $set: {
        paystart: usage.historydate,
        payend: usage.historyend,
        updateMode: usage.updatemode,
      },
    },
  );

  return usage.monthend;
}

async function updateUsage(userId, curDate, type, csvs = 0) {
  const record = await Usage.findOne({ userId: toObjectId(userId) });
  if (!record || !record.history || record.history.length < 1) return null;

  const lastUsage = record.history[record.history.length - 1];
  if (
    moment(lastUsage.monthend).format('YYYY-MM-DD') <
    moment(curDate).format('YYYY-MM-DD')
  )
    return null;

  switch (type) {
    case 'save':
      await Usage.updateOne(
        { _id: record._id, 'history._id': lastUsage._id },
        { $set: { 'history.$.savesuse': lastUsage.savesuse + 1 } },
      );
      break;
    case 'profile':
      await Usage.updateOne(
        { _id: record._id, 'history._id': lastUsage._id },
        { $set: { 'history.$.profiesuse': lastUsage.profiesuse + 1 } },
      );
      break;
    // case 'report':
    //   await Usage.updateOne(
    //     { _id: record._id, 'history._id': lastUsage._id },
    //     { $set: { 'history.$.reportsuse': lastUsage.reportsuse + 1 } },
    //   );
    //   break;
    case 'csv':
      await Usage.updateOne(
        { _id: record._id, 'history._id': lastUsage._id },
        { $set: { 'history.$.csvuse': lastUsage.csvuse + csvs } },
      );
      break;
    case 'search':
      await Usage.updateOne(
        { _id: record._id, 'history._id': lastUsage._id },
        { $set: { 'history.$.pagesuse': lastUsage.pagesuse + 1 } },
      );
      break;
  }

  return true;
}

async function getCurrentUsage(userId, curDate, type) {
  const record = await Usage.findOne({ userId: toObjectId(userId) });
  if (!record || !record.history || record.history.length < 1) return null;

  const lastUsage = record.history[record.history.length - 1];
  if (
    moment(lastUsage.monthend).format('YYYY-MM-DD') <
    moment(curDate).format('YYYY-MM-DD')
  )
    return null;
  // if (lastUsage.paystatus === false)
  //   return -1;

  switch (type) {
    case 'save':
      if (lastUsage.savesuse >= lastUsage.savesplan) return null;
      break;
    case 'profile':
      if (lastUsage.profiesuse >= lastUsage.profiesplan) {
        if (!lastUsage.alertprofies) return 10;
        else
          await Usage.updateOne(
            {
              userId: toObjectId(userId),
              'history._id': toObjectId(lastUsage._id),
            },
            { $set: { 'history.$.alertprofies': true } },
          );
        return null;
      }
      break;
    case 'report':
      if (lastUsage.profiesuse >= lastUsage.profiesplan) return null;
      break;
    case 'csv':
      if (lastUsage.csvuse >= lastUsage.csvplan) return null;
      break;
    case 'search':
      if (lastUsage.pagesuse >= lastUsage.pagesplan) return null;
  }

  return true;
}

async function getHistory({ userId }) {
  let temp, history;
  try {
    temp = await HistoryRepo.getHistory(userId);
    history = temp.map((itm) => {
      return {
        _id: itm._id.toString(),
        historydate: itm.historydate,
        amount: itm.amount,
        periodtype: itm.periodtype,
        paytype: itm.paytype,
        status: itm.status,
        plantype: itm.plantype,
      };
    });
  } catch (ex) {
    console.log(ex.toString());
  }

  return history;
}

async function getPlanUsage(userId, historyDate) {
  let info = await Usage.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
      },
    },
    {
      $unwind: {
        path: '$history',
      },
    },
    {
      $match: {
        'history.historydate': historyDate,
        'history.status': { $lt: 2 },
      },
    },
    {
      $project: {
        _id: '$history._id',
        plantype: '$history.plantype',
        historyend: '$history.historyend',
        name: '$history.name',
        amount: '$history.amount',
        plantype: '$history.plantype',
        pagesplan: '$history.pagesplan',
        pagesuse: '$history.pagesuse',
        profiesplan: '$history.profiesplan',
        profiesuse: '$history.profiesuse',
        reportsplan: '$history.reportsplan',
        reportsuse: '$history.reportsuse',
        csvplan: '$history.csvplan',
        csvuse: '$history.csvuse',
        savesuse: '$history.savesuse',
        savesplan: '$history.savesplan',
        iscampaign: '$history.iscampaign',
        isinsight: '$history.isinsight',
        iskeyaccount: '$history.iskeyaccount',
        monthend: '$history.monthend',
        updatemode: '$history.updatemode',
      },
    },
  ]);

  if (info.length < 1) return null;

  return info[0];
}

async function ChangeUser2Free(userId, startDate, endDate) {
  await User.updateOne(
    {
      _id: toObjectId(userId),
    },
    {
      $set: {
        plantype: 'Free trial',
        paystart: startDate,
        payend: endDate,
        periodtype: 0,
        paytype: 0,
        paystatus: 0,
      },
    },
  );

  const planRecord = await Plans.findOne({ type: 'Free trial' });
  await Usage.updateOne(
    { userId: toObjectId(userId) },
    {
      $addToSet: {
        history: {
          historydate: startDate,
          historyend: endDate,
          monthend: endDate,
          paytype: 0,
          periodtype: 0,
          plantype: 'Free trial',
          amount: 0,
          status: 0,
          pagesplan: planRecord.pages ?? 0,
          pagesuse: 0,
          profiesplan: planRecord.profies ?? 0,
          profiesuse: 0,
          reportsplan: planRecord.reports ?? 0,
          reportsuse: 0,
          csvplan: planRecord.csv ?? 0,
          csvuse: 0,
          savesplan: planRecord.saves ?? 0,
          savesuse: 0,
          updatemode: false,
          iscampaign: false,
          isinsight: false,
          iskeyaccount: false,
        },
      },
    },
  );

  await History.updateOne(
    { userId: toObjectId(userId) },
    {
      $addToSet: {
        history: {
          historydate: startDate,
          paytype: 0,
          periodtype: 0,
          plantype: 'Free trial',
          amount: 0,
          status: 0,
        },
      },
    },
  );
}

async function closeCustom({ userId, enddate }) {
  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  if (
    lastRecord === null ||
    lastRecord.status === 2 ||
    lastRecord.plantype !== 'カスタム'
  )
    return;

  await Usage.updateOne(
    { userId: toObjectId(userId), 'history._id': toObjectId(lastRecord._id) },
    { $set: { 'history.$.status': 2, 'history.$.historyend': enddate } },
  );

  // Change to Free trial mode
  await ChangeUser2Free(
    userId,
    enddate,
    moment()
      .add(7, 'days')
      .format('YYYY-MM-DD'),
  );
}

async function savePlan2Custom({
  userId,
  name,
  search,
  profile,
  report,
  csv,
  saves,
  startdate,
  enddate,
  usesearch,
  useprofile,
  usereport,
  usecsv,
  usesaves,
  updatemode,
  keyrequested,
  insight,
  campaign,
  keyaccount,
}) {
  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  try {
    if (
      lastRecord !== null &&
      lastRecord.status < 2 &&
      lastRecord.plantype === 'カスタム'
    ) {
      enddate = updatemode
        ? moment(startdate)
            .add(1, 'months')
            .format('YYYY/MM/DD')
        : enddate;
      let monthend = updatemode
        ? moment(startdate)
            .add(1, 'months')
            .format('YYYY-MM-DD')
        : enddate;
      await Usage.updateOne(
        { userId: toObjectId(userId), 'history._id': lastRecord._id },
        {
          $set: {
            'history.$.name': name,
            'history.$.historydate': startdate,
            'history.$.historyend': enddate,
            'history.$.monthend': monthend,
            'history.$.paytype': 2,
            'history.$.periodtype': 4,
            'history.$.plantype': 'カスタム',
            'history.$.amount': 0,
            'history.$.status': 0,
            'history.$.pagesplan': search,
            'history.$.profiesplan': profile,
            'history.$.reportsplan': report,
            'history.$.csvplan': csv,
            'history.$.savesplan': saves,
            'history.$.pagesuse': usesearch === '' ? 0 : usesearch,
            'history.$.profiesuse': useprofile === '' ? 0 : useprofile,
            'history.$.reportsuse': usereport === '' ? 0 : usereport,
            'history.$.csvuse': usecsv === '' ? 0 : usecsv,
            'history.$.savesuse': usesaves === '' ? 0 : usesaves,
            'history.$.updatemode': updatemode,
            'history.$.iscampaign': insight,
            'history.$.isinsight': campaign,
            'history.$.iskeyaccount': keyaccount,
          },
        },
      );

      await User.updateOne(
        {
          _id: toObjectId(userId),
        },
        {
          $set: {
            paystart: startdate,
            payend: enddate,
            updateMode: updatemode,
          },
        },
      );

      if (keyrequested === false) {
        try {
          await Keys.updateOne(
            { userId: toObjectId(userId) },
            {
              $set: {
                status: false,
              },
            },
          );
        } catch (ex) {
          console.log(ex);
        }
      }
    }
  } catch (ex) {
    console.log(ex);
  }
}

async function getPlanFromCustom({ userId }) {
  let keyrequested = false;
  let keyRecord = await Keys.findOne({ userId: toObjectId(userId) });
  if (keyRecord && keyRecord.status === true) {
    const requestDate = moment(keyRecord.updatedAt).format('YYYY-MM-DD');
    const weekAgo = moment()
      .subtract(5, 'days')
      .format('YYYY-MM-DD');

    keyrequested = weekAgo < requestDate;
  }

  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  if (
    lastRecord !== null &&
    lastRecord.status < 2 &&
    lastRecord.plantype === 'カスタム'
  ) {
    return {
      name: lastRecord.name ?? lastRecord.plantype,
      startdate: lastRecord.historydate,
      enddate: lastRecord.historyend,
      search: lastRecord.pagesplan,
      profile: lastRecord.profiesplan,
      report: lastRecord.reportsplan,
      csv: lastRecord.csvplan,
      saves: lastRecord.savesplan,
      usesearch: lastRecord.pagesuse,
      useprofile: lastRecord.profiesuse,
      usereport: lastRecord.reportsuse,
      usecsv: lastRecord.csvuse,
      usesaves: lastRecord.savesuse,
      updatemode: lastRecord.updatemode,
      keyrequested: keyrequested,
      iscampaign: lastRecord.iscampaign,
      isinsight: lastRecord.isinsight,
      iskeyaccount: lastRecord.iskeyaccount,
    };
  } else {
    return {
      name: 'カスタム',
      startdate: '',
      enddate: '',
      search: '',
      profile: '',
      report: '',
      csv: '',
      saves: '',
      usesearch: '',
      useprofile: '',
      usereport: '',
      usecsv: '',
      usesaves: '',
      updatemode: '',
      keyrequested: keyrequested,
      iscampaign: false,
      isinsight: false,
      iskeyaccount: false,
    };
  }
}

async function updatePayStatus({ userId, type, paystatus }) {
  try {
    await User.updateOne(
      {
        _id: toObjectId(userId),
      },
      {
        $set: {
          paystatus: paystatus === true ? 1 : 0,
        },
      },
    );

    let temp = await Usage.findOne({ userId: toObjectId(userId) });
    let lastRecord =
      temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
    await Usage.updateOne(
      { userId: toObjectId(userId), 'history._id': toObjectId(lastRecord._id) },
      { $set: { 'history.$.paystatus': paystatus } },
    );
    return true;
  } catch (ex) {
    return false;
  }
}

async function switchPlan({ userId, type, startdate, amount, isAnnualy }) {
  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  try {
    if (lastRecord !== null && lastRecord.status < 2) {
      await Usage.updateOne(
        {
          userId: toObjectId(userId),
          'history._id': toObjectId(lastRecord._id),
        },
        { $set: { 'history.$.status': 2, 'history.$.historyend': startdate } },
      );

      await History.updateOne(
        { userId: toObjectId(userId) },
        {
          $addToSet: {
            history: {
              historydate: startdate,
              paytype: lastRecord.paytype,
              periodtype: lastRecord.periodtype,
              plantype: lastRecord.plantype,
              amount: lastRecord.amount,
              status: 2,
            },
          },
        },
      );
    }

    const planType = type;
    const planRecord = await Plans.findOne({ type: planType });
    let endDate = moment(startdate)
      .add(1, 'months')
      .format('YYYY-MM-DD');
    let monthEnd = moment(startdate)
      .add(1, 'months')
      .format('YYYY-MM-DD');
    if (type === 'Free trial') {
      endDate = moment(startdate)
        .add(7, 'days')
        .format('YYYY-MM-DD');
      monthEnd = moment(startdate)
        .add(7, 'days')
        .format('YYYY-MM-DD');
    } else if (isAnnualy === true)
      endDate = moment(startdate)
        .add(12, 'months')
        .format('YYYY-MM-DD');
    else if (isAnnualy === false)
      endDate = moment(startdate)
        .add(6, 'months')
        .format('YYYY-MM-DD');

    await Usage.updateOne(
      { userId: toObjectId(userId) },
      {
        $addToSet: {
          history: {
            historydate: startdate,
            historyend: endDate,
            monthend: monthEnd,
            paytype: 1,
            periodtype: isAnnualy === true ? 3 : 2,
            plantype: type,
            amount: amount,
            status: 0,
            paystatus: false,
            pagesplan: planRecord.pages ?? 0,
            profiesplan: planRecord.profies ?? 0,
            reportsplan: planRecord.reports ?? 0,
            csvplan: planRecord.csv ?? 0,
            savesplan: planRecord.saves ?? 0,
            pagesuse: 0,
            profiesuse: 0,
            reportsuse: 0,
            csvuse: 0,
            savesuse: 0,
            updatemode: false,
            iscampaign: planRecord.iscampaign,
            isinsight: planRecord.isinsight,
            iskeyaccount: planRecord.isaccount,
          },
        },
      },
    );

    await User.updateOne(
      {
        _id: toObjectId(userId),
      },
      {
        $set: {
          plantype: type,
          paystart: startdate,
          payend: endDate,
          periodtype: isAnnualy === true ? 3 : 2,
          paytype: 1,
          paystatus: 0,
        },
      },
    );
  } catch (ex) {
    console.log(ex);
    return false;
  }

  return true;
}

async function updateCustomAmount(userId, amount, isNew) {
  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  if (lastRecord.plantype !== 'カスタム') return;

  amount += lastRecord.amount ? +lastRecord.amount : 0;
  if (!isNew) amount -= amount;

  await Usage.updateOne(
    { userId: toObjectId(userId), 'history._id': toObjectId(lastRecord._id) },
    { $set: { 'history.$.amount': amount, 'history.$.paystatus': true } },
  );

  await User.updateOne(
    {
      _id: toObjectId(userId),
    },
    {
      $set: { paystatus: 1 },
    },
  );
}

async function switchPlan2Custom({ userId, startdate }) {
  let temp = await Usage.findOne({ userId: toObjectId(userId) });
  let lastRecord =
    temp.history.length > 0 ? temp.history[temp.history.length - 1] : null;
  try {
    if (lastRecord !== null && lastRecord.status < 2) {
      await Usage.updateOne(
        {
          userId: toObjectId(userId),
          'history._id': toObjectId(lastRecord._id),
        },
        { $set: { 'history.$.status': 2, 'history.$.historyend': startdate } },
      );

      await History.updateOne(
        { userId: toObjectId(userId) },
        {
          $addToSet: {
            history: {
              historydate: startdate,
              paytype: lastRecord.paytype,
              periodtype: lastRecord.periodtype,
              plantype: lastRecord.plantype,
              amount: lastRecord.amount,
              status: 2,
            },
          },
        },
      );
    }

    await Usage.updateOne(
      { userId: toObjectId(userId) },
      {
        $addToSet: {
          history: {
            paytype: 2,
            periodtype: 4,
            plantype: 'カスタム',
            amount: 0,
            status: 0,
            pagesplan: 0,
            profiesplan: 0,
            reportsplan: 0,
            csvplan: 0,
            savesplan: 0,
            pagesuse: 0,
            profiesuse: 0,
            reportsuse: 0,
            csvuse: 0,
            savesuse: 0,
            iscampaign: false,
            isinsight: false,
            iskeyaccount: false,
            updatemode: false,
          },
        },
      },
    );

    await User.updateOne(
      {
        _id: toObjectId(userId),
      },
      {
        $set: {
          plantype: 'カスタム',
          paystart: '',
          payend: '',
          periodtype: 4,
          paytype: 2,
          paystatus: 0,
        },
      },
    );
  } catch (ex) {
    console.log(ex);
  }
}

export default UsageRepo;
