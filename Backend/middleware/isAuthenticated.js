import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token provided", success: false });
    }
    const decoded =   jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return (
        res.status(401).json({ message: "Invalid token" }), (success = false)
      );
    }
    req.id = decoded.userId;

    const user = await User.findById(req.id).select("isBlocked role");
    if (!user) {
      return res.status(401).json({ message: "User not found", success: false });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked by admin", success: false });
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticateToken;