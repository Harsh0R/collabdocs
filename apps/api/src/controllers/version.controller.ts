
import type { Request, Response } from "express";

import {
    createDocumentVersion,
    listDocumentVersions,
    getDocumentVersion,
} from "../services/version.service.js";

// ===================================
// CREATE DOCUMENT VERSION
// ===================================

export async function createDocumentVersionController(
    req: Request,
    res: Response
) {
    const version = await createDocumentVersion(
        req.params.documentId.toString(),
        req.user!.id
    );

    return res.status(201).json({
        status: "success",
        message: "Document version saved successfully",
        data: { version },
    });
}

// ===================================
// LIST DOCUMENT VERSIONS
// ===================================

export async function listDocumentVersionsController(
    req: Request,
    res: Response
) {
    const versions = await listDocumentVersions(
        req.params.documentId.toString(),
        req.user!.id
    );

    return res.status(200).json({
        status: "success",
        data: {
            versions,
            total: versions.length,
        },
    });
}

// ===================================
// GET SINGLE DOCUMENT VERSION
// ===================================

export async function getDocumentVersionController(
    req: Request,
    res: Response
) {
    const version = await getDocumentVersion(
        req.params.documentId.toString(),
        req.params.versionId.toString(),
        req.user!.id
    );

    return res.status(200).json({
        status: "success",
        data: { version },
    });
}
