/* const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware; */

//Bypass code
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // 🚨 DEV MODE BYPASS
  if (process.env.BYPASS_AUTH === "true") {
    console.warn("⚠️  [DEV MODE] Auth middleware bypassed.");
    req.user = {
      id: 9999, // ✅ Use an integer for compatibility with PostgreSQL
    };
    return next();
  }

  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
