
import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import {
    createDocumentVersionController,
    listDocumentVersionsController,
    getDocumentVersionController,
} from "../controllers/version.controller.js";

const router = Router();

// All version endpoints require authentication.
router.use(authenticate);

// Create a new document version.
router.post(
    "/:documentId/versions",
    createDocumentVersionController
);

// List document versions.
router.get(
    "/:documentId/versions",
    listDocumentVersionsController
);

// Get a particular version.
router.get(
    "/:documentId/versions/:versionId",
    getDocumentVersionController
);

export default router;
