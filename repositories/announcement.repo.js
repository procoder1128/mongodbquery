const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;
const { Announcement } = require('models');

const AnnouncementRepo = {
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  getAnnouncement,
  getAnnouncements,
};

async function getAllAnnouncements() {
  let announcement = await Announcement.aggregate([
    {
      $project: {
        text: 1,
        from: 1,
        to: 1,
        status: 1,
        users: 1,
        link: 1,
      },
    },
  ]);
  return announcement;
}

async function updateAnnouncement(
  announcementId,
  { text, from, to, status, users, link },
) {
  await Announcement.updateOne(
    { _id: toObjectId(announcementId) },
    {
      $set: {
        text,
        from,
        to,
        status,
        users,
        link,
      },
    },
  );
}

async function createAnnouncement(text, from, to, status, users, link) {
  try {
    let newAnnouncement = await Announcement.create({
      text,
      from,
      to,
      status,
      users,
      link,
    });

    return newAnnouncement._id.toString();
  } catch (e) {
    return -1;
  }
}

async function getAnnouncement(id) {
  try {
    let record = await Announcement.findOne({ _id: toObjectId(id) });

    return record;
  } catch (e) {
    return -1;
  }
}

async function getAnnouncements(id) {
  let announcement = await Announcement.aggregate([
    {
      $match: { status: 0 },
    },
    {
      $project: {
        text: 1,
        from: 1,
        to: 1,
        status: 1,
        users: 1,
        link: 1,
      },
    },
    {
      $sort: { from: -1 },
    },
  ]);

  announcement = announcement.filter((itm) => {
    let dateTo = new Date(itm.to);
    dateTo.setDate(dateTo.getDate() + 1);
    return (
      new Date(itm.from) <= new Date() &&
      dateTo >= new Date() &&
      (!id || !itm.users || itm.users == [] || (itm.users ?? []).includes(id))
    );
  });

  return announcement;
}

export default AnnouncementRepo;
