import Redis from 'ioredis';
import config from 'config';
import crypto from 'crypto';

const redisConfig = config.get('redis');
const redis = new Redis(redisConfig);

/**
 * Cache Service
 */

const Cache = async (email, prfx, data) => {
  const ex = data.expire ? data.expire : 60 * 60 * 3;
  const key = `${email}:${prfx}:${crypto
    .createHash('md5')
    .update(JSON.stringify(data.args))
    .digest('hex')}`;

  const hit = await redis.get(key);
  if (hit && !data.upsert) {
    return data.raw ? hit : JSON.parse(hit);
  }

  const result = await data.fnc(...data.args);
  if (result) {
    if (data.raw) {
      redis.set(key, result, 'EX', ex);
    } else {
      redis.set(key, JSON.stringify(result), 'EX', ex);
    }
  }

  return result;
};

const drop = async (email, key) => {
  const match = await redis.keys(`${email}:${key}`);
  match.map((m) => redis.del(m));
};

export { Cache, drop };
