import mongoose from 'mongoose';

const WebServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true , unique: true},
  status: { type: String, enum: ['up', 'down'], default: 'down' },
  latency: { type: Number, default: -1 }, // -1 indicates unknown latency
}, { timestamps: true });

const WebServer = mongoose.models.WebServer || mongoose.model('WebServer', WebServerSchema);

export default WebServer;