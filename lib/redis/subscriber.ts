import { Redis } from 'ioredis';

const createSubscriberClient = () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL is missing. Falling back to local redis for subscriber.');
    return new Redis('redis://default:password@127.0.0.1:6379');
  }
  return new Redis(url);
};

declare global {
  var redisSubscriber: Redis | undefined;
}

const redisSubscriber = globalThis.redisSubscriber ?? createSubscriberClient();

export default redisSubscriber;

if (process.env.NODE_ENV !== 'production') {
  globalThis.redisSubscriber = redisSubscriber;
}
