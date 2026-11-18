// apps/api/src/services/document.service.ts


import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { DocumentRole } from "@prisma/client";

// ===================================
// TYPES
// ===================================

interface CreateDocumentInput {
    title?: string;
}

interface UpdateDocumentInput {
    title: string;
}

interface ListDocumentsInput {
    page: number;
    limit: number;
    search?: string;
}

interface ShareDocumentInput {
    email: string;
    role: DocumentRole;
}

// ===================================
// GET ACCESSIBLE DOCUMENT
// ===================================

async function getDocumentForUser(
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

        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },

            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
            },
        },
    });

    if (!document) {
        throw new AppError("Document not found", 404);
    }

    const role =
        document.ownerId === userId
            ? "OWNER"
            : document.members.find(
                (member) => member.userId === userId
            )?.role;

    if (!role) {
        throw new AppError("Access denied", 403);
    }

    return {
        ...document,
        currentUserRole: role,
    };
}

// ===================================
// CHECK OWNER PERMISSION
// ===================================

async function requireOwner(
    documentId: string,
    userId: string
) {
    const document = await getDocumentForUser(
        documentId,
        userId
    );

    if (document.ownerId !== userId) {
        throw new AppError(
            "Only the document owner can perform this action",
            403
        );
    }

    return document;
}

// ===================================
// CHECK EDIT PERMISSION
// ===================================

async function requireEditor(
    documentId: string,
    userId: string
) {
    const document = await getDocumentForUser(
        documentId,
        userId
    );

    if (
        document.ownerId !== userId &&
        document.currentUserRole !== DocumentRole.EDITOR
    ) {
        throw new AppError(
            "You do not have permission to edit this document",
            403
        );
    }

    return document;
}

// ===================================
// CREATE DOCUMENT
// ===================================

export async function createDocument(
    userId: string,
    input: CreateDocumentInput
) {
    const title = input.title?.trim() || "Untitled document";

    const document = await prisma.document.create({
        data: {
            title,
            ownerId: userId,
        },

        select: {
            id: true,
            title: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return {
        ...document,
        role: "OWNER",
    };
}

// ===================================
// LIST DOCUMENTS
// ===================================

export async function listDocuments(
    userId: string,
    input: ListDocumentsInput
) {
    const { page, limit, search } = input;

    const skip = (page - 1) * limit;

    const where = {
        deletedAt: null,

        OR: [
            { ownerId: userId },
            {
                members: {
                    some: { userId },
                },
            },
        ],

        ...(search
            ? {
                title: {
                    contains: search,
                    mode: "insensitive" as const,
                },
            }
            : {}),
    };

    const [documents, total] = await prisma.$transaction([
        prisma.document.findMany({
            where,

            orderBy: {
                updatedAt: "desc",
            },

            skip,
            take: limit,

            select: {
                id: true,
                title: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,

                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },

                members: {
                    where: {
                        userId,
                    },
                    select: {
                        role: true,
                    },
                },

                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        }),

        prisma.document.count({ where }),
    ]);

    const data = documents.map((document) => ({
        id: document.id,
        title: document.title,
        ownerId: document.ownerId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,

        owner: document.owner,

        role:
            document.ownerId === userId
                ? "OWNER"
                : document.members[0]?.role,

        collaboratorCount: document._count.members,
    }));

    return {
        documents: data,

        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ===================================
// GET SINGLE DOCUMENT
// ===================================

export async function getDocument(
    documentId: string,
    userId: string
) {
    const document = await getDocumentForUser(
        documentId,
        userId
    );

    return {
        id: document.id,
        title: document.title,
        ownerId: document.ownerId,

        owner: document.owner,

        members: document.members,

        role: document.currentUserRole,

        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}

// ===================================
// UPDATE DOCUMENT TITLE
// ===================================

export async function updateDocument(
    documentId: string,
    userId: string,
    input: UpdateDocumentInput
) {
    await requireEditor(documentId, userId);

    return prisma.document.update({
        where: {
            id: documentId,
        },

        data: {
            title: input.title.trim(),
        },

        select: {
            id: true,
            title: true,
            ownerId: true,
            updatedAt: true,
        },
    });
}

// ===================================
// DELETE DOCUMENT
// ===================================

export async function deleteDocument(
    documentId: string,
    userId: string
) {
    await requireOwner(documentId, userId);

    await prisma.document.update({
        where: {
            id: documentId,
        },

        data: {
            deletedAt: new Date(),
        },
    });

    return {
        message: "Document deleted successfully",
    };
}

// ===================================
// SHARE DOCUMENT
// ===================================

export async function shareDocument(
    documentId: string,
    userId: string,
    input: ShareDocumentInput
) {
    await requireOwner(documentId, userId);

    const email = input.email.trim().toLowerCase();

    const targetUser = await prisma.user.findUnique({
        where: { email },

        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
        },
    });

    if (!targetUser) {
        throw new AppError(
            "User with this email does not exist",
            404
        );
    }

    if (targetUser.id === userId) {
        throw new AppError(
            "You are already the document owner",
            400
        );
    }

    const member = await prisma.documentMember.create({
        data: {
            documentId,
            userId: targetUser.id,
            role: input.role,
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                },
            },
        },
    });

    return member;
}

// ===================================
// UPDATE MEMBER ROLE
// ===================================

export async function updateMemberRole(
    documentId: string,
    memberId: string,
    userId: string,
    role: DocumentRole
) {
    await requireOwner(documentId, userId);

    const member = await prisma.documentMember.findFirst({
        where: {
            id: memberId,
            documentId,
        },
    });

    if (!member) {
        throw new AppError("Document member not found", 404);
    }

    return prisma.documentMember.update({
        where: {
            id: memberId,
        },

        data: {
            role,
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
}

// ===================================
// REMOVE MEMBER
// ===================================

export async function removeMember(
    documentId: string,
    memberId: string,
    userId: string
) {
    await requireOwner(documentId, userId);

    const member = await prisma.documentMember.findFirst({
        where: {
            id: memberId,
            documentId,
        },
    });

    if (!member) {
        throw new AppError("Document member not found", 404);
    }

    await prisma.documentMember.delete({
        where: {
            id: memberId,
        },
    });

    return {
        message: "Member removed successfully",
    };
}
