
import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import {
    createDocumentController,
    listDocumentsController,
    getDocumentController,
    updateDocumentController,
    deleteDocumentController,
    shareDocumentController,
    updateMemberRoleController,
    removeMemberController,
} from "../controllers/document.controller.js";

const router = Router();

// All document endpoints require authentication.
router.use(authenticate);

// Document CRUD
router.post("/", createDocumentController);

router.get("/", listDocumentsController);

router.get("/:documentId", getDocumentController);

router.patch("/:documentId", updateDocumentController);

router.delete("/:documentId", deleteDocumentController);

// Document sharing
router.post(
    "/:documentId/members",
    shareDocumentController
);

// Member role management
router.patch(
    "/:documentId/members/:memberId",
    updateMemberRoleController
);

// Remove collaborator
router.delete(
    "/:documentId/members/:memberId",
    removeMemberController
);

export default router;
