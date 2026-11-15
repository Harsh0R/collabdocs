
import type { Request, Response } from "express";
import { z } from "zod";
import { DocumentRole } from "@prisma/client";

import {
    createDocument,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    updateMemberRole,
    removeMember,
} from "../services/document.service.js";

// ===================================
// VALIDATION SCHEMAS
// ===================================

const createDocumentSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
});

const updateDocumentSchema = z.object({
    title: z.string().trim().min(1).max(200),
});

const listDocumentsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
});

const shareDocumentSchema = z.object({
    email: z.string().trim().email().max(255),
    role: z.nativeEnum(DocumentRole),
});

const updateMemberSchema = z.object({
    role: z.nativeEnum(DocumentRole),
});

// ===================================
// CREATE DOCUMENT
// ===================================

export async function createDocumentController(
    req: Request,
    res: Response
) {
    const input = createDocumentSchema.parse(req.body);

    const document = await createDocument(
        req.user!.id,
        input
    );

    return res.status(201).json({
        status: "success",
        message: "Document created successfully",
        data: { document },
    });
}

// ===================================
// LIST DOCUMENTS
// ===================================

export async function listDocumentsController(
    req: Request,
    res: Response
) {
    const input = listDocumentsSchema.parse(req.query);

    const result = await listDocuments(
        req.user!.id,
        input
    );

    return res.status(200).json({
        status: "success",
        data: result,
    });
}

// ===================================
// GET DOCUMENT
// ===================================

export async function getDocumentController(
    req: Request,
    res: Response
) {
    const docId = req.params.documentId
    const document = await getDocument(
        docId.toString(),
        req.user!.id
    );

    return res.status(200).json({
        status: "success",
        data: { document },
    });
}

// ===================================
// UPDATE DOCUMENT
// ===================================

export async function updateDocumentController(
    req: Request,
    res: Response
) {
    const input = updateDocumentSchema.parse(req.body);

    const document = await updateDocument(
        req.params.documentId.toString(),
        req.user!.id,
        input
    );

    return res.status(200).json({
        status: "success",
        message: "Document updated successfully",
        data: { document },
    });
}

// ===================================
// DELETE DOCUMENT
// ===================================

export async function deleteDocumentController(
    req: Request,
    res: Response
) {
    const result = await deleteDocument(
        req.params.documentId.toString(),
        req.user!.id
    );

    return res.status(200).json({
        status: "success",
        ...result,
    });
}

// ===================================
// SHARE DOCUMENT
// ===================================

export async function shareDocumentController(
    req: Request,
    res: Response
) {
    const input = shareDocumentSchema.parse(req.body);

    const member = await shareDocument(
        req.params.documentId.toString(),
        req.user!.id,
        input
    );

    return res.status(201).json({
        status: "success",
        message: "Document shared successfully",
        data: { member },
    });
}

// ===================================
// UPDATE MEMBER ROLE
// ===================================

export async function updateMemberRoleController(
    req: Request,
    res: Response
) {
    const input = updateMemberSchema.parse(req.body);

    const member = await updateMemberRole(
        req.params.documentId.toString(),
        req.params.memberId.toString(),
        req.user!.id,
        input.role
    );

    return res.status(200).json({
        status: "success",
        message: "Member role updated successfully",
        data: { member },
    });
}

// ===================================
// REMOVE MEMBER
// ===================================

export async function removeMemberController(
    req: Request,
    res: Response
) {
    const result = await removeMember(
        req.params.documentId.toString(),
        req.params.memberId.toString(),
        req.user!.id
    );

    return res.status(200).json({
        status: "success",
        ...result,
    });
}
