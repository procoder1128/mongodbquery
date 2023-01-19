import _ from 'lodash';
const mongoose = require('mongoose');
const {UpdateHistory} = require('models');
const toObjectId = mongoose.Types.ObjectId;
import Constants from 'constants/constants';
import Lang from 'constants/lang';

const UpdateRepo = {
  getlast,
  updateHistory
};

async function getlast() {
  try {
    let counts = await UpdateHistory.count({}).
      then(numDocs => {
        return numDocs;
      }).catch (err => {
        return 0;
      });

    if (counts < 1)
      return null;
      
    let record = await UpdateHistory.find().sort({'updated': -1}).limit(1);
    if (record.length < 1)
      return null;

    return record[0];
  } catch (ex) {
    console.log(ex.toString());
  }
}

async function updateHistory({status, type, downs, totals, error, updated}) {
  try {
    await UpdateHistory.updateOne(
      {updated: updated},
      {$set:
        {
          updated: updated,
          step: type,
          downloads: downs,
          totals: totals,
          error: error,
          completed: status
        }
      },
      {upsert:true}
    );
  } catch (ex) {
    console.log(ex.toString());
  }
}

export default UpdateRepo;