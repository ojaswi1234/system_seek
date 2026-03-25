import { createRequire } from "module";
const require = createRequire(import.meta.url);

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://default:password@127.0.0.1:6379");






export default redis;
