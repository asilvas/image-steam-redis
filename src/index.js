import Redis from 'ioredis';
import { storage } from 'image-steam';
import extend from 'extend';
import defaultOptions from './redis-default-options';
import File from './file';

const StorageBase = storage.Base;
const gClients = {}; // track unique instances



export default class StorageRedis extends StorageBase
{
  constructor(opts) {
    super(opts);

    if (!this.options.servers || !Array.isArray(this.options.servers) || this.options.servers.length === 0) {
      throw new Error('StorageRedis.servers must be a valid array of objects [{host, port}]');
    }
  }

  fetch(opts, originalPath, stepsHash, cb) {
    const options = this.getOptions(opts);
    const client = this.getClient(options);

    let key = originalPath;
    if (stepsHash) {
      key += '/' + stepsHash;
    }

    client.getBuffer(key, (err, result) => {
      if (err) return void cb(err);
      try {
        const file = File.fromBuffer(result);

        cb(null, file.info, file.data);
      } catch (ex) {
        return cb(ex);
      }
    });
  }

  store(opts, originalPath, stepsHash, image, cb) {
    const options = this.getOptions(opts);
    const client = this.getClient(options);

    if (!stepsHash) {
      return void cb(new Error('StorageRedis::Cannot store an image over the original'));
    }
    const key = `${originalPath}/${stepsHash}`;

    image.info.stepsHash = stepsHash;

    // combine all data into a single key/value to avoid having to hit multiple nodes to reduce cache misses
    const fileBuffer = new File(image.info, image.buffer).toBuffer();

    client.set(key, fileBuffer, cb);
  }

  getOptions(opts) {
    return extend(true, {
      options: defaultOptions
    }, this.options, opts);
  }

  getClient(options) {
    const clientKey = options.servers.map(s => `${s.host}:${s.port}`).join(';');
    let client = gClients[clientKey];
    // reuse cluster client to avoid needless reconnects
    if (client) return client;

    client = new Redis.Cluster(options.servers, options.options || defaultOptions);
    gClients[clientKey] = client;

    return client;
  }
}
