const mongoose = require("mongoose");

const WebServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const WebServer = mongoose.model('WebServer', WebServerSchema);

async function test() {
  try {
    const res = await WebServer.findById("a-bad-id");
    console.log("NOT THROWN", res);
  } catch(e) {
    console.log("THROWN", e.message);
  }
  process.exit(0);
}
test();
