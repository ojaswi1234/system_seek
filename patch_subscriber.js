const fs = require('fs');
const file = 'lib/redis/subscriber.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /const createSubscriberClient = \(\) => {/g,
  `const subscriberRedisOptions = {\n  maxRetriesPerRequest: 3,\n};\n\nconst createSubscriberClient = () => {`
).replace(
  /return new Redis\('redis:\/\/default:password@127\.0\.0\.1:6379'\);/g,
  `return new Redis('redis://default:password@127.0.0.1:6379', subscriberRedisOptions);`
).replace(
  /return new Redis\(url\);/g,
  `return new Redis(url, subscriberRedisOptions);`
);
fs.writeFileSync(file, content);
