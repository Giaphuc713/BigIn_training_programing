const router = require("express").Router();
const mongoose = require("mongoose");
const { ApiError } = require("@/error");
const Issue = require("@/models/issue");
const Project = require("@/models/project");
const Comment = require("@/models/comment");

router.post("/issues/:issueKey/comments", async (req, res) => {
    const issueKey = req.params.issueKey;
    const issue = await Issue.findOne({ issueKey });
    if (!issue) {
        throw new ApiError(404, "ISSUE_IS_NOT_FOUND", "Issue is not found");
    }

    const body = req.body;
    if (!body) {
        throw new ApiError(400, "INVALID_BODY", "Invalid_body");
    }
    const text = body.body.trim();
    if (text.length === 0 || text.length > 2000) {
        throw new ApiError(
            400,
            "INVALID_COMMENT_BODY",
            "body must contains 1 to 2000 characters",
        );
    }
    const comment = await Comment.create({
        issueId: issue._id,
        authorId: req.user._id,
        body: text,
    });
    res.status(201).json(comment);
});

router.get("/issues/:issueKey/comments", async (req, res) => {
    const issueKey = req.params.issueKey;
    const issue = Issue.findOne({ issueKey });
    if (!issue) {
        throw new ApiError(404, "ISSUE_IS_NOT_FOUND", "Issue is not found");
    }
    const comments = await Comment.find(
        { issueId: issue._id }.sort({ createdAt: 1 }),
    );
    res.json(comments);
});

router.delete("/comments/:id", async (req, res) => {
    const commentKey = request.params.id;
    const comment = await Comment.findOne({ commentKey });

    if (!comment) {
        throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
    }
    const issue = await Issue.findById(comment.issueId);
    if (!issue) {
        throw new ApiError(
            404,
            "ONLY_MEMBER_OF_THIS_PROJECT_IS_ALLOWED",
            "Only member of this project has permission to delete comment",
        );
    }

    await comment.deleteOne();
    res.status(204).end();
});

router.patch("/comments/:id", async (req, res) => {
    const commentKey = request.params.id;
    const comment = await Comment.findOne({ commentKey });

    if (!comment) {
        throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");
    }
    const issue = await Issue.findById(comment.issueId);
    if (!issue) {
        throw new ApiError(
            404,
            "ONLY_MEMBER_OF_THIS_PROJECT_IS_ALLOWED",
            "Only member of this project has permission to update comment",
        );
    }

    // Not a author of this comment
    if (!comment.authorId.equals(req.user._id)) {
        throw new ApiError(
            403,
            "PERMISSION DENY",
            "Only author has permission to update their comment",
        );
    }
    const body = req.body;
    if (!body) {
        throw new ApiError(400, "INVALID_BODY", "Invalid_body");
    }
    const text = body.body.trim();
    const updatedComment = await Comment.findOneAndUpdate(
        { _id: comment.id },
        { $set: { body: text } },
        { new: true, runValdators: true },
    );
    res.json(updatedComment);
});

module.exports = router;
