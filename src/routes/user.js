const router = require("express").Router();
const User = require("../models/user");

router.get("/users", async (req, res) => res.json(await User.find()));
module.exports = router;
