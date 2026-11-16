import "./config/env.js";

import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import * as Y from "yjs";

import { prisma } from "./config/prisma.js";
import { verifySyncToken } from "./utils/auth.js";

const PORT = Number(process.env.SYNC_PORT) || 1234;

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

const server = new Server({
  port: PORT,

  name: "collabdocs-sync",

  // Redis supports communication between
  // multiple Hocuspocus server instances.
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

    // Document name must be the actual
    // document ID from PostgreSQL.

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
      document.ownerId === user.id ? "OWNER" : document.members[0]?.role;

    if (!role) {
      throw new Error("Document access denied");
    }

    // Viewers can connect and receive updates,
    // but cannot submit document changes.

    connectionConfig.readOnly = role === "VIEWER";

    console.log(`[AUTH] ${user.name} connected | ${documentName} | ${role}`);

    if (typeof payload.exp !== "number") {
      throw new Error("Invalid token: expiration missing");
    }

    if (Date.now() >= payload.exp * 1000) {
      throw new Error("Access token expired");
    }
    // Context becomes available in subsequent hooks.
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
    if (context?.tokenExpiresAt && Date.now() >= context.tokenExpiresAt) {
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

    // Create an empty Yjs document if no
    // previous collaborative state exists.

    const ydoc = new Y.Doc();

    if (storedState) {
      Y.applyUpdate(ydoc, new Uint8Array(storedState.state));

      console.log(`[LOAD] Restored document ${documentName}`);
    }

    return ydoc;
  },

  // ===================================
  // PERSIST DOCUMENT TO POSTGRESQL
  // ===================================

  async onStoreDocument({ documentName, document }) {
    console.log(`[SAVE] Persisting document ${documentName}`);

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

    // Update document activity timestamp.
    await prisma.document.updateMany({
      where: {
        id: documentName,
        deletedAt: null,
      },

      data: {
        updatedAt: new Date(),
      },
    });

    console.log(`[SAVE] Successfully persisted ${documentName}`);
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
