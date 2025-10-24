import Redis from 'ioredis'

let redisClient: Redis

if (process.env.REDIS_URI) {
  // Dùng URI từ Redis Cloud hoặc Render
  redisClient = new Redis(process.env.REDIS_URI, {
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  })
} else {
  // Dùng host + port local
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  })
}

redisClient.on('connect', () => console.log('✅ Redis connected'))
redisClient.on('error', (err) => console.error('❌ Redis error:', err))

export default redisClient
