export default {
  maxRedirections: 1,
  retryDelayOnClusterDown: false,
  retryDelayOnFailover: false,
  retryDelayOnTryAgain: false,
  redisOptions: {
    connectTimeout: 1000,
    keyPrefix: 'isteam::'
  }
}
