import _ from 'lodash';
import moment from 'moment';
const {Credit} = require('models');
const mongoose = require('mongoose');
const toObjectId = mongoose.Types.ObjectId;

const CreditRepo = {
  getWeight,
  setWeight
};

async function getWeight(path) {
  // const temp = await Credit.findOne(
  //   {path: path}
  // )
  return path
}

async function setWeight(content) {  
  let creator = Object.keys(content).map((path) => {
    return {
      path: path,
      weight: Number(content[path])
    }
  })
  await Credit.create(creator);
}

export default CreditRepo;