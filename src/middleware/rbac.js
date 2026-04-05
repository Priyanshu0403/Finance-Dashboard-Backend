const { Role } = require("../types");

const ROLE_RANK = {
  [Role.VIEWER]: 1,
  [Role.ANALYST]: 2,
  [Role.ADMIN]: 3,
};

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const userRank = ROLE_RANK[user.role] ?? 0;
    const allowed = roles.some((role) => userRank >= ROLE_RANK[role]);

    if (!allowed) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
      return;
    }

    next();
  };
}

const viewerOrAbove = requireRole(Role.VIEWER);
const analystOrAbove = requireRole(Role.ANALYST);
const adminOnly = requireRole(Role.ADMIN);

module.exports = {
  requireRole,
  viewerOrAbove,
  analystOrAbove,
  adminOnly,
};
