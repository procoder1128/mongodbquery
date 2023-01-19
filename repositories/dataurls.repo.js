const { DataUrls } = require('models');
import { getHash } from 'constants/constants';

const DataUrlsRepo = {
  addData,
  getData,
};

async function addData(data) {
  const hash = getHash(data).toString();
  const record = await DataUrls.findOne({ hash });
  if (record) {
    if (record.data == data) {
      return hash;
    } else {
      console.log({ UnexpectedDuplicateHash: [data, hash] });
      return '';
    }
  }

  const row = await DataUrls.create({
    data,
    hash,
  });

  console.log({ dataUrlId: row._id.toString() });

  return hash;
}

async function getData(hash) {
  let result = await DataUrls.aggregate([{ $match: { hash } }]);
  return result?.[0]?.data ?? '';
}

export default DataUrlsRepo;
