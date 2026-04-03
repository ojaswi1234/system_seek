import mongoose from "mongoose";
import './lib/models/WebServer';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test");
  try {
    const res = await mongoose.model('WebServer').findById("not-valid-id-12345");
    console.log("NOT THROWN", res);
  } catch(e) {
    console.log("THROWN", e.message);
  }
  process.exit(0);
}
test();
