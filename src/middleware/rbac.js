import { Role } from "../types.js";

const ROLE_RANK = {
  [Role.VIEWER]: 1,
  [Role.ANALYST]: 2,
  [Role.ADMIN]: 3,
};

export function requireRole(...roles) {
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

export const viewerOrAbove = requireRole(Role.VIEWER);
export const analystOrAbove = requireRole(Role.ANALYST);
export const adminOnly = requireRole(Role.ADMIN);
