import rateLimit from "express-rate-limit";

/** 100 req / 15 min — applied to all routes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again in 15 minutes" },
});

/** 20 req / 15 min — applied to all POST routes */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests on this endpoint, please try again in 15 minutes" },
});
