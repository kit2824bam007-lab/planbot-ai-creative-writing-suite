const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/planbot?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-change-in-production-planbot-2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_KEY_2: z.string().optional(),
  GEMINI_API_KEY_3: z.string().optional(),
  GEMINI_API_KEY_4: z.string().optional(),
  GEMINI_API_KEY_5: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  DAILY_LIMIT_FREE: z.string().default('10').transform((val) => parseInt(val, 10)),
  DAILY_LIMIT_ANON: z.string().default('3').transform((val) => parseInt(val, 10)),
  ADMIN_API_KEY: z.string().default('admin-secret-key-planbot'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  ORIGINALITY_CHECK_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  ORIGINALITY_SIMILARITY_THRESHOLD_LOW: z.string().default('0.70').transform((val) => parseFloat(val)),
  ORIGINALITY_SIMILARITY_THRESHOLD_HIGH: z.string().default('0.85').transform((val) => parseFloat(val))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment warning: Some variables used defaults:', parsed.error.format());
}

const env = parsed.success ? parsed.data : envSchema.parse({});

module.exports = { env };
