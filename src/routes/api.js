"use strict";

const { Router } = require("express");

const router = Router();

router.use("/health", require("./health"));
router.use("/auth", require("./auth"));
router.use("/profile", require("./profile"));
router.use("/admin", require("./admin"));
router.use("/dashboard", require("./dashboard"));
router.use("/otp", require("./otp"));
router.use("/v2", require("./otp-v2"));
router.use("/firebase", require("./firebase"));
router.use("/devices", require("./devices"));
router.use("/apk", require("./apk"));
router.use("/telegram", require("./telegram"));

module.exports = router;
