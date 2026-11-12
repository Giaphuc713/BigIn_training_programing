const User = require("@/models/user");
const { ApiError } = require("@/error");

module.exports = async (req, res, next) => {
  const id = req.get("X-User-Id");
  const user = id ? await User.findById(id) : null;
  if (!user || !user.isActive) {
    throw new ApiError(
      401,
      "UNAUTHORIZED",
      "Missing, unknown or inactive X-User-Id",
    );
  }
  req.user = user;
  next();
};
