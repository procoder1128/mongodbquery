const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;
const { Monitoring } = require('models');

const MonitoringRepo = {
  getMonitoringById,
  updateMonitoringByHiddenList,
};

async function getMonitoringById(campId) {
  try {
    let lists = await Monitoring.aggregate([
      {
        $match: {
          campId: toObjectId(campId),
        },
      },
      {
        $lookup: {
          from: 'instagrams',
          localField: 'infId',
          foreignField: 'userId',
          as: 'infProfile',
        },
      },
      {
        $unwind: {
          path: '$infProfile',
        },
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campId',
          foreignField: '_id',
          as: 'monitoring',
        },
      },
      {
        $unwind: {
          path: '$monitoring',
        },
      },
      {
        $project: {
          _id: 0,
          'infProfile.userId': 1,
          'infProfile.profile.fullname': 1,
          'infProfile.profile.picture': 1,
          'infProfile.profile.url': 1,
          'infProfile.profile.username': 1,
          contents: 1,
          settings: '$monitoring.monitoring',
        },
      },
    ]);

    if (!lists?.length) return null;
    let hashtagFilter = lists[0].settings.hashtag;
    let mentionFilter = lists[0].settings.mention;
    let tagFilter = lists[0].settings.tag;

    lists.map((list) => {
      list.contents = list.contents?.filter((content) => {
        if (content.type === 'story') return true;
        if (content.hidden === true) return false;
        // NOTE: 全件取得は filter せずに返す
        if (list.settings.hasAllTagAndMention) {
          return true;
        }
        let isHashtag = content.hashtags?.filter((el) =>
          hashtagFilter.includes(el),
        );
        let isMention = content.mentions?.filter((el) =>
          mentionFilter.includes(el),
        );
        let isTag = content.tags?.filter((el) => tagFilter.includes(el));
        let check =
          isHashtag?.length === 0 &&
          isMention?.length === 0 &&
          isTag?.length === 0;
        return !check;
      });

      delete list.settings;
    });

    return lists;
  } catch (error) {
    console.log('error occurred while fetching data from db,', error);
  }

  return campId;
}

async function updateMonitoringByHiddenList(campId, hiddenList) {
  try {
    let lists = await Monitoring.aggregate([
      {
        $match: {
          campId: toObjectId(campId),
        },
      },
    ]);

    // NOTE: await したいので for...of
    for (const list of lists) {
      list.contents.map((content) => {
        const isHidden = hiddenList.includes(content.pk);
        if (isHidden) {
          content.hidden = isHidden;
        }
      });

      await Monitoring.updateOne(
        { _id: list._id },
        { $set: { contents: list.contents } },
      );
    }
  } catch (error) {
    console.log('error occurred while update data from db,', error);
  }
}

export default MonitoringRepo;
