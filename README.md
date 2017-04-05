# image-steam-redis
Redis client for [Image Steam](https://github.com/asilvas/node-image-steam)
built on [ioredis](https://github.com/luin/ioredis).


## Default Options

By default, tuned specifically for fast-fail redis cluster cache.
If you require high availability cache or persistence to disk,
you'll want to update the options accordingly.


## Options

```ecmascript 6
import isteamRedis from 'image-steam-redis';

const redis = new isteamRedis({
  servers: [
    /* see servers */
  ],
  options: {
    /* see options */
  }
});
```

| Param | Info | Link |
| --- | --- | --- |
| servers | Array of startup nodes | See [startupNodes](https://github.com/luin/ioredis/blob/master/API.md#new-clusterstartupnodes-options) |
| options | Redis & Redis Cluster options | See [options](https://github.com/luin/ioredis/blob/master/API.md#new-clusterstartupnodes-options) |


## Usage

Example:

```ecmascript 6
import isteam from 'image-steam';

const options = {
  storage: {
    app: {
      static: {
        driver: 'http',
        endpoint: 'https://github.com/asilvas/node-image-steam'
      }
    },
    cache: {
      driverPath: 'image-steam-redis',
      servers: [
        {
          port: 6379,
          host: '127.0.0.1'
        },
        {
          port: 6380,
          host: '127.0.0.1'
        },
        {
          port: 6381,
          host: '127.0.0.1'
        }
      ],
      options: {
        redisOptions: {
          keyPrefix: 'isteam::dev::'
        }
      }
    }
  }
}

http.createServer(new isteam.http.Connect(options).getHandler())
  .listen(13337, '127.0.0.1')
;
```
