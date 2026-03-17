import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const apps = await db.collection("applications").find({}).toArray();
  let removed = 0;

  for (const app of apps) {
    const applicant = await db
      .collection("users")
      .findOne({ _id: app.applicant }, { projection: { _id: 1 } });
    const job = await db
      .collection("jobs")
      .findOne({ _id: app.job }, { projection: { _id: 1 } });

    if (!applicant || !job) {
      await db.collection("applications").deleteOne({ _id: app._id });
      await db.collection("jobs").updateMany({}, { $pull: { applications: app._id } });
      removed += 1;
    }
  }

  const validAppIds = (
    await db.collection("applications").find({}, { projection: { _id: 1 } }).toArray()
  ).map((d) => d._id);

  await db
    .collection("jobs")
    .updateMany({}, { $pull: { applications: { $nin: validAppIds } } });

  const remaining = await db.collection("applications").countDocuments({});
  console.log("Orphan applications removed:", removed);
  console.log("Remaining applications:", remaining);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
