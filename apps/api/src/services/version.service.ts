// apps/api/src/services/version.service.ts

import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { DocumentRole } from "@prisma/client";

// ===================================
// GET ACCESSIBLE DOCUMENT
// ===================================

async function getAccessibleDocument(
    documentId: string,
    userId: string
) {
    const document = await prisma.document.findFirst({
        where: {
            id: documentId,
            deletedAt: null,
            OR: [
                { ownerId: userId },
                {
                    members: {
                        some: { userId },
                    },
                },
            ],
        },
        select: {
            id: true,
            title: true,
            ownerId: true,
            members: {
                where: { userId },
                select: { role: true },
            },
        },
    });

    if (!document) {
        throw new AppError("Document not found", 404);
    }

    const role =
        document.ownerId === userId
            ? "OWNER"
            : document.members[0]?.role;

    if (!role) {
        throw new AppError("Access denied", 403);
    }

    return {
        ...document,
        currentUserRole: role,
    };
}

// ===================================
// CHECK EDIT PERMISSION
// ===================================

async function requireVersionEditPermission(
    documentId: string,
    userId: string
) {
    const document = await getAccessibleDocument(
        documentId,
        userId
    );

    if (
        document.ownerId !== userId &&
        document.currentUserRole !== DocumentRole.EDITOR
    ) {
        throw new AppError(
            "You do not have permission to create document versions",
            403
        );
    }

    return document;
}

// ===================================
// CREATE DOCUMENT VERSION
// ===================================

export async function createDocumentVersion(
    documentId: string,
    userId: string
) {
    const document = await requireVersionEditPermission(
        documentId,
        userId
    );

    // Read the latest state persisted by the sync server.
    const currentState = await prisma.documentState.findUnique({
        where: {
            documentId,
        },
    });

    if (!currentState) {
        throw new AppError(
            "No saved document state exists yet. Open and synchronize the document before creating a version.",
            409
        );
    }

    const version = await prisma.documentVersion.create({
        data: {
            documentId,
            title: document.title,
            state: currentState.state,
            createdById: userId,
        },
        select: {
            id: true,
            documentId: true,
            title: true,
            createdById: true,
            createdAt: true,
        },
    });

    return version;
}

// ===================================
// LIST DOCUMENT VERSIONS
// ===================================

export async function listDocumentVersions(
    documentId: string,
    userId: string
) {
    await getAccessibleDocument(documentId, userId);

    const versions = await prisma.documentVersion.findMany({
        where: {
            documentId,
        },

        orderBy: [
            { createdAt: "asc" },
            { id: "asc" },
        ],

        select: {
            id: true,
            title: true,
            createdAt: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    // Assign chronological version numbers.
    const numberedVersions = versions.map(
        (version, index) => ({
            ...version,
            versionNumber: index + 1,
        })
    );

    // Return newest version first.
    return numberedVersions.reverse();
}

// ===================================
// GET SINGLE DOCUMENT VERSION
// ===================================

export async function getDocumentVersion(
    documentId: string,
    versionId: string,
    userId: string
) {
    await getAccessibleDocument(documentId, userId);

    const version = await prisma.documentVersion.findFirst({
        where: {
            id: versionId,
            documentId,
        },

        select: {
            id: true,
            documentId: true,
            title: true,
            state: true,
            createdAt: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!version) {
        throw new AppError("Document version not found", 404);
    }

    return {
        id: version.id,
        documentId: version.documentId,
        title: version.title,

        // Binary Yjs state is encoded as Base64 for JSON transport.
        state: Buffer.from(version.state).toString("base64"),

        createdAt: version.createdAt,
        createdBy: version.createdBy,
    };
}
