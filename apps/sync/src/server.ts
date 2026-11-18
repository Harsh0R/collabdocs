// apps/sync/src/server.ts


import "./config/env.js";

import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import * as Y from "yjs";

import { prisma } from "./config/prisma.js";
import { verifySyncToken } from "./utils/auth.js";

const PORT = Number(process.env.SYNC_PORT) || 1234;

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

// ===================================
// DOCUMENT PERSISTENCE QUEUE
// ===================================

// Prevent overlapping persistence operations for the same document
// within this sync-server process.

const persistenceQueues = new Map<string, Promise<void>>();

async function persistDocumentState(
  documentName: string,
  document: Y.Doc,
): Promise<void> {
  const previous =
    persistenceQueues.get(documentName) ?? Promise.resolve();

  const current = previous.catch(() => undefined).then(async () => {
    const state = Buffer.from(Y.encodeStateAsUpdate(document));

    await prisma.documentState.upsert({
      where: {
        documentId: documentName,
      },

      create: {
        documentId: documentName,
        state,
      },

      update: {
        state,
      },
    });

    await prisma.document.updateMany({
      where: {
        id: documentName,
        deletedAt: null,
      },

      data: {
        updatedAt: new Date(),
      },
    });
  });

  persistenceQueues.set(documentName, current);

  try {
    await current;
  } finally {
    if (persistenceQueues.get(documentName) === current) {
      persistenceQueues.delete(documentName);
    }
  }
}

const server = new Server({
  port: PORT,

  name: "collabdocs-sync",

  // ===================================
  // REDIS
  // ===================================

  extensions: [
    new Redis({
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),

      options: {
        password: redisUrl.password
          ? decodeURIComponent(redisUrl.password)
          : undefined,
      },
    }),
  ],

  // ===================================
  // AUTHENTICATION + AUTHORIZATION
  // ===================================

  async onAuthenticate({ documentName, token, connectionConfig }) {
    if (!token) {
      throw new Error("Authentication required");
    }

    const payload = verifySyncToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },

      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentName,
        deletedAt: null,

        OR: [
          {
            ownerId: user.id,
          },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },

      select: {
        id: true,
        ownerId: true,

        members: {
          where: {
            userId: user.id,
          },

          select: {
            role: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error("You do not have access to this document");
    }

    const role =
      document.ownerId === user.id
        ? "OWNER"
        : document.members[0]?.role;

    if (!role) {
      throw new Error("Document access denied");
    }

    // Viewers can receive updates but cannot edit.
    connectionConfig.readOnly = role === "VIEWER";

    console.log(
      `[AUTH] ${user.name} connected | ${documentName} | ${role}`,
    );

    if (typeof payload.exp !== "number") {
      throw new Error("Invalid token: expiration missing");
    }

    if (Date.now() >= payload.exp * 1000) {
      throw new Error("Access token expired");
    }

    return {
      user,
      documentId: document.id,
      role,
      tokenExpiresAt: payload.exp * 1000,
    };
  },

  // ===================================
  // TOKEN EXPIRATION CHECK
  // ===================================

  async beforeHandleMessage({ context }) {
    if (
      context?.tokenExpiresAt &&
      Date.now() >= context.tokenExpiresAt
    ) {
      throw new Error("Access token expired");
    }
  },

  // ===================================
  // LOAD DOCUMENT FROM POSTGRESQL
  // ===================================

  async onLoadDocument({ documentName }) {
    console.log(`[LOAD] Loading document ${documentName}`);

    const document = await prisma.document.findFirst({
      where: {
        id: documentName,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    const storedState = await prisma.documentState.findUnique({
      where: {
        documentId: documentName,
      },
    });

    const ydoc = new Y.Doc();

    if (storedState) {
      Y.applyUpdate(ydoc, new Uint8Array(storedState.state));

      console.log(`[LOAD] Restored document ${documentName}`);
    }

    return ydoc;
  },

  // ===================================
  // AUTOMATIC DOCUMENT PERSISTENCE
  // ===================================

  async onStoreDocument({ documentName, document }) {
    console.log(`[SAVE] Persisting document ${documentName}`);

    await persistDocumentState(documentName, document);

    console.log(`[SAVE] Successfully persisted ${documentName}`);
  },

  // ===================================
  // MANUAL SAVE VERSION REQUEST
  // ===================================

  async onStateless({
    payload,
    document,
    documentName,
    connection,
  }) {
    let message: {
      type?: unknown;
      requestId?: unknown;
    };

    try {
      message = JSON.parse(payload);
    } catch {
      // Ignore unrelated or invalid stateless messages.
      return;
    }

    if (message?.type !== "collabdocs:save-version") {
      return;
    }

    const requestId =
      typeof message.requestId === "string"
        ? message.requestId
        : "";

    const sendAcknowledgement = (
      ok: boolean,
      error?: string,
    ) => {
      connection.sendStateless(
        JSON.stringify({
          type: "collabdocs:save-version:ack",
          requestId,
          ok,
          error,
        }),
      );
    };

    if (!requestId) {
      sendAcknowledgement(false, "Missing request ID");
      return;
    }

    const context = connection.context as {
      documentId?: string;
      role?: string;
      tokenExpiresAt?: number;
    };

    // Verify that this connection belongs to this document.
    if (context?.documentId !== documentName) {
      sendAcknowledgement(false, "Document access denied");
      return;
    }

    // Do not allow expired sessions to save versions.
    if (
      !context?.tokenExpiresAt ||
      Date.now() >= context.tokenExpiresAt
    ) {
      sendAcknowledgement(false, "Access token expired");
      return;
    }

    // Only owners and editors can save versions.
    if (
      context.role !== "OWNER" &&
      context.role !== "EDITOR"
    ) {
      sendAcknowledgement(
        false,
        "You do not have permission to save versions",
      );
      return;
    }

    try {
      console.log(
        `[VERSION SAVE] Request received | ${documentName}`,
      );

      // Persist the latest in-memory Yjs document.
      await persistDocumentState(documentName, document);

      console.log(
        `[VERSION SAVE] State persisted | ${documentName}`,
      );

      // Acknowledge only the requesting connection.
      sendAcknowledgement(true);

    } catch (error) {
      console.error(
        `[VERSION SAVE] Failed | ${documentName}`,
        error,
      );

      sendAcknowledgement(
        false,
        "Could not persist document state",
      );
    }
  },

  // ===================================
  // CONNECTION EVENTS
  // ===================================

  async onConnect({ documentName }) {
    console.log(`[CONNECT] Client connected: ${documentName}`);
  },

  async onDisconnect({ documentName, context }) {
    console.log(
      `[DISCONNECT] ${
        context?.user?.name || "Unknown user"
      } left ${documentName}`,
    );
  },
});

server.listen();

console.log(`CollabDocs Sync Server running on port ${PORT}`);
