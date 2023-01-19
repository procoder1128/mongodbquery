const { UserTags } = require('models');
const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;

const UserTagsRepo = {
  removeTag,
  getList,
  appendTag,
};

async function removeTag(userId, selId) {
  try {
    await UserTags.updateOne(
      { userId: toObjectId(userId) },
      { $pull: { tags: { _id: toObjectId(selId) } } },
    );
  } catch (ex) {
    console.log(ex.toString());
  }

  return true;
}

async function getList(userId) {
  const record = await UserTags.findOne({ userId: toObjectId(userId) });

  return record?.tags ?? [];
}

async function appendTag(userId, name, color, tagId) {
  let newId = '';

  try {
    if (tagId === '') {
      const tagRecord = await UserTags.findOne({
        userId: toObjectId(userId),
        'tags.name': name,
      });
      if (tagRecord) return -1;

      await UserTags.updateOne(
        { userId: toObjectId(userId) },
        { $addToSet: { tags: { name, color } } },
        { upsert: true },
      );
    } else {
      await UserTags.updateOne(
        { userId: toObjectId(userId), 'tags._id': toObjectId(tagId) },
        {
          $set: {
            'tags.$.name': name,
            'tags.$.color': color,
          },
        },
      );
    }

    while (true) {
      const record = await UserTags.findOne({ userId: toObjectId(userId) });
      const appendTag = record.tags.filter(
        (itm) => itm.name == name && itm.color == color,
      );
      if (appendTag?.length > 0) {
        newId = appendTag[0]._id.toString();
        break;
      }
    }
  } catch (ex) {
    console.log(ex.toString());
  }

  return newId;
}

export default UserTagsRepo;
