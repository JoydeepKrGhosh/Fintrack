// //Bypass code
// const jwt = require("jsonwebtoken");

// const authMiddleware = (req, res, next) => {
//   // 🚨 DEV MODE BYPASS
//   if (process.env.BYPASS_AUTH === "true") {
//     console.warn("⚠️  [DEV MODE] Auth middleware bypassed.");
//     req.user = {
//       id: 9999, // ✅ Use an integer for compatibility with PostgreSQL
//     };
//     return next();
//   }

//   const token = req.header("Authorization")?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized: No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     res.status(401).json({ error: "Invalid token" });
//   }
// };

// module.exports = authMiddleware;


const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403); // Invalid token
      req.user = user; // Attach user info to request
      next();
    });
  } else {
    console.log('No token provided or invalid format');
    res.sendStatus(401);
  }
}

module.exports = authMiddleware;
