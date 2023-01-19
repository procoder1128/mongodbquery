const { Memo } = require('models');
const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;

const MemoRepo = {
  setMemo,
  getMemo,
};

async function setMemo({ userId, influencerId, type, val }) {
  let query = {
    userId: userId,
    influencerId: influencerId,
    type: type,
  };
  let update = { content: val };
  let options = { upsert: true, new: true, setDefaultsOnInsert: true };
  await Memo.findOneAndUpdate(query, update, options);

  return true;
}

async function getMemo({ userId, influencerId, type }) {
  let memo = await Memo.findOne(
    {
      userId: userId,
      influencerId: influencerId,
      type: type,
    },
    'content',
  );

  return memo;
}

export default MemoRepo;
