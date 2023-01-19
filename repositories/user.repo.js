const md5 = require('md5');
const mongoose = require('mongoose');
const { History, User, Usage, Plans, LoginHistory } = require('models');
const toObjectId = mongoose.Types.ObjectId;

const UserRepo = {
  isAgreed,
  isShown,
  createUser,
  changePwd,
  getAllUsers,
  getLoginHistory,
  getUserByEmail,
  getUserInfo,
  resetPassword,
  updateLoginAt,
  getLoginAt,
  updateUser,
  setTermsAgree,
  reduceCredit,
};

async function isAgreed(userId) {
  const user = await User.findOne({ _id: toObjectId(userId) });
  return user.agreed;
}

async function isShown(userId) {
  const user = await User.findOne({ _id: toObjectId(userId) });
  if (!user.termshowed) {
    await User.updateOne(
      { _id: toObjectId(userId) },
      { $set: { termshowed: true } },
    );
  }

  return user.termshowed;
}

async function setTermsAgree(userId) {
  try {
    await User.updateOne(
      { _id: toObjectId(userId) },
      { $set: { agreed: true } },
    );
  } catch (e) {
    return -9;
  }
}

async function resetPassword(email) {
  const user = await User.findOne({ email: email });
  if (!user) return false;

  await User.updateOne(
    { _id: user._id },
    { $set: { password: md5('123456789') } },
  );
  return true;
}

async function getUserInfo(id) {
  try {
    const user = await User.findOne({ _id: toObjectId(id) });
    return user;
  } catch (err) {
    const user = 'error';
    return user;
  }
}

async function getUserByEmail(val) {
  const user = await User.findOne({ email: val });
  return user;
}

async function getLoginHistory(userId) {
  const record = await LoginHistory.findOne({ _id: toObjectId(userId) });
  if (!record) return [];
  return record.history;
}

async function getAllUsers() {
  let users = await User.aggregate([
    {
      $project: {
        name: 1,
        email: 1,
        password: 1,
        company: 1,
        url: 1,
        addr: 1,
        phone: 1,
        plantype: 1,
        periodtype: 1,
        paytype: 1,
        payend: 1,
        perms: 1,
        loginAt: 1,
        cdate: '$createdAt',
      },
    },
  ]);
  return users;
}

async function changePwd(userId, pwd) {
  await User.updateOne(
    { _id: toObjectId(userId) },
    { $set: { password: md5(pwd) } },
  );
}

async function updateLoginAt(userId, loginAt) {
  await User.updateOne({ _id: userId }, { $set: { loginAt: loginAt } });

  await LoginHistory.updateOne(
    { _id: userId },
    { $addToSet: { history: loginAt } },
    { upsert: true },
  );
}

async function getLoginAt(userId) {
  try {
    const user = await User.findOne({ _id: toObjectId(userId) });

    return user.loginAt;
  } catch (err) {
    return null;
  }
}

async function updateUser(
  userId,
  { company, url, name, phone, email, addr, password },
) {
  let obj = {
    name: name,
    email: email,
    company: company,
    url: url,
    addr: addr,
    phone: phone,
  };
  if (password) {
    obj.password = md5(password);
  }

  await User.updateOne({ _id: toObjectId(userId) }, { $set: obj });
}

async function createUser(
  company,
  url,
  name,
  phone,
  email,
  password,
  addr,
  paystart,
  payend,
) {
  let newId = -9;

  try {
    const planRecord = await Plans.findOne({ type: 'Free trial' });
    if (!planRecord) return -2;

    const existUser = await User.findOne({ email: email });
    if (existUser) return -1;

    let newUser = await User.create({
      company: company,
      url: url,
      name: name,
      phone: phone,
      email: email,
      password: md5(password),
      addr: addr,
      paystart: paystart,
      payend: payend,
      paystatus: 0,
    });

    await Usage.create({
      userId: newUser._id,
      history: [
        {
          historydate: paystart,
          historyend: payend,
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
        },
      ],
    });

    await History.create({
      userId: newUser._id,
      history: [
        {
          historydate: paystart,
          status: 0,
        },
      ],
    });

    newId = newUser._id.toString();
  } catch (e) {
    return -9;
  }

  return newId;
}

async function reduceCredit(userId, weight) {
  try {
    const user = await User.findOne({ _id: toObjectId(userId) });
    const currentCredit = user.creditNumber - weight;
    await User.updateOne(
      { _id: toObjectId(userId) },
      { $set: { creditNumber: currentCredit } },
    );
    return true;
  } catch (err) {
    return false;
  }
}

export default UserRepo;
