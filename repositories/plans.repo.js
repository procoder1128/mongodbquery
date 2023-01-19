const {Plans} = require('models');

const PlansRepo = {
  getPlans,
  updatePlans
};

async function getPlans() {
  let list = await Plans.find();

  return list;
}

async function updatePlans(enterprise, advanced, performance, essentials, trial) {
  await Plans.updateOne({type: "Enterprise"}, {$set:{...enterprise, type:"Enterprise"}}, {upsert:true});
  await Plans.updateOne({type: "Advanced"}, {$set:{...advanced, type:"Advanced"}}, {upsert:true});
  await Plans.updateOne({type: "Performance"}, {$set:{...performance, type:"Performance"}}, {upsert:true});
  await Plans.updateOne({type: "Essentials"}, {$set:{...essentials, type:"Essentials"}}, {upsert:true});
  await Plans.updateOne({type: "Free trial"}, {$set:{...trial, type:"Free trial"}}, {upsert:true});
}

export default PlansRepo;