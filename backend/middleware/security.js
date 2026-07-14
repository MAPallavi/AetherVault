// Custom security headers and rate limiter middleware to avoid external packages

// Security headers middleware (similar to Helmet)
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';img-src 'self' data:;");
  next();
};

// Basic in-memory rate limiter
const ipStore = {};
const rateLimiter = (limit = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    // If in development mode, relax the rate limiter limit
    const activeLimit = process.env.NODE_ENV === 'production' ? limit : 10000;

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!ipStore[ip]) {
      ipStore[ip] = [];
    }

    // Filter out requests older than the window
    ipStore[ip] = ipStore[ip].filter(timestamp => now - timestamp < windowMs);

    if (ipStore[ip].length >= activeLimit) {
      return res.status(429).json({
        message: "Too many requests from this IP, please try again later."
      });
    }

    ipStore[ip].push(now);
    next();
  };
};

module.exports = {
  securityHeaders,
  rateLimiter
};
