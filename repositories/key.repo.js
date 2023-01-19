import _ from 'lodash';
import moment from 'moment';
const { Keys } = require('models');
const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;

const KeyRepo = {
  getStatus,
  getRequest,
  setRequest,
};

async function getStatus(userId) {
  let record = await Keys.findOne({ userId: toObjectId(userId) });

  let status = false;
  if (record && record.status) {
    const requestDate = moment(record.updatedAt).format('YYYY-MM-DD');
    const weekAgo = moment()
      .subtract(5, 'days')
      .format('YYYY-MM-DD');

    status = weekAgo <= requestDate;
  }

  return status;
}

async function getRequest(userId, type) {
  let result = await Keys.find({ userId: toObjectId(userId), type });
  return result;
}

async function setRequest(userId, data) {
  await Keys.create({
    userId: toObjectId(userId),
    type: data.type,
    title: data.title,
    email: data.email,
    IDS: data.userList?.map((itm) => {
      return { key: itm.label.substring(1), value: '' };
    }),
    tick: data.checked ?? false,
    status: true,
  });
}

export default KeyRepo;
