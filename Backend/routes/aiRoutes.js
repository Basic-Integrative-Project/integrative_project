// Defines routes for AI-powered reply suggestion and meeting extraction endpoints.
const express = require("express");
const router = express.Router();
const { suggestReplyHandler, extractMeetingHandler } = require("../controllers/aiController");

router.post("/suggest-reply", suggestReplyHandler);
router.post("/extract-meeting", extractMeetingHandler);

module.exports = router;
