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
    const clusterOpts = this.options.options;
    if (clusterOpts && clusterOpts.redisOptions && clusterOpts.redisOptions.keyPrefix) {
      this.keyPrefix = clusterOpts.redisOptions.keyPrefix;
      delete clusterOpts.redisOptions.keyPrefix; // remove from redisOptions to avoid double prefix if ioredis ever fixes cluster bug
    } else {
      this.keyPrefix = 'isteam::';
    }
  }

  fetch(opts, originalPath, stepsHash, cb) {
    const options = this.getOptions(opts);
    const client = this.getClient(options);

    let key = `${this.keyPrefix}${originalPath}`;
    if (stepsHash) {
      key += '/' + stepsHash;
    }

    client.getBuffer(key, (err, result) => {
      if (err) return void cb(err);
      if (!result) return void cb(new Error('File ' + key + ' not found'));
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
    const key = `${this.keyPrefix}${originalPath}/${stepsHash}`;

    image.info.stepsHash = stepsHash;

    // combine all data into a single key/value to avoid having to hit multiple nodes to reduce cache misses
    const fileBuffer = new File(image.info, image.buffer).toBuffer();

    client.set(key, fileBuffer, cb);
  }

  deleteCache(opts, originalPath, cb) {
    // intended to be used with cache objects only
    const options = this.getOptions(opts);
    const client = this.getClient(options);
    const nodes = client.nodes('master');

    const match = `${this.keyPrefix}${originalPath + (originalPath[originalPath.length - 1] === '/' ? '' : '/')}*`;
    const scanKeys = (node) => {
      return new Promise((reject, resolve) => {
        const stream = node.scanStream({
          match,
          count: 500 // ~2.5ms
        });
        stream.on('data', keys => {
          if (keys && keys.length > 0) {
            // fire and forget: don't block on key deletion
            keys.forEach(key => client.del(key));
            // note: cannot use `client.del(keys)` as the keys can span many nodes
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    };

    // run SCAN on all nodes for the child assets
    Promise.all(nodes.map(scanKeys)).then(() => cb()).catch(cb);
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
