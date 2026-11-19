// apps/sync/src/server.ts

import "./config/env.js";

import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import * as Y from "yjs";

import { prisma } from "./config/prisma.js";
import { verifySyncToken } from "./utils/auth.js";
import { assertDocumentLockOwnership, withDocumentLock } from "./utils/redis-lock.js";

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
  const previous = persistenceQueues.get(documentName) ?? Promise.resolve();

  const current = previous
    .catch(() => undefined)
    .then(async () => {
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

// ===================================
// CLONE TIPTAP YJS XML NODES
// ===================================

function cloneXmlNode(
  node: Y.XmlElement | Y.XmlText | Y.XmlHook,
): Y.XmlElement | Y.XmlText {
  if (node instanceof Y.XmlText) {
    const clonedText = new Y.XmlText();

    clonedText.applyDelta(node.toDelta());

    return clonedText;
  }

  if (node instanceof Y.XmlElement) {
    const clonedElement = new Y.XmlElement(node.nodeName);

    for (const [key, value] of Object.entries(node.getAttributes())) {
      if (value !== undefined) {
        clonedElement.setAttribute(key, value);
      }
    }

    const clonedChildren = node.toArray().map((child) => cloneXmlNode(child));

    if (clonedChildren.length > 0) {
      clonedElement.insert(0, clonedChildren);
    }

    return clonedElement;
  }

  throw new Error("Unsupported Yjs XML node type");
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
      document.ownerId === user.id ? "OWNER" : document.members[0]?.role;

    if (!role) {
      throw new Error("Document access denied");
    }

    // Viewers can receive updates but cannot edit.
    connectionConfig.readOnly = role === "VIEWER";

    console.log(`[AUTH] ${user.name} connected | ${documentName} | ${role}`);

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

  // ===================================
  // SAVE + RESTORE VERSION REQUESTS
  // ===================================

  async onStateless({ payload, document, documentName, connection }) {
    let message: {
      type?: unknown;
      requestId?: unknown;
      versionId?: unknown;
    };

    try {
      message = JSON.parse(payload);
    } catch {
      return;
    }

    const isSaveRequest = message.type === "collabdocs:save-version";

    const isRestoreRequest = message.type === "collabdocs:restore-version";

    if (!isSaveRequest && !isRestoreRequest) {
      return;
    }

    const requestId =
      typeof message.requestId === "string" ? message.requestId : "";

    const acknowledgementType = isSaveRequest
      ? "collabdocs:save-version:ack"
      : "collabdocs:restore-version:ack";

    const sendAcknowledgement = (ok: boolean, error?: string) => {
      connection.sendStateless(
        JSON.stringify({
          type: acknowledgementType,
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

    // ===================================
    // VERIFY CONNECTION PERMISSIONS
    // ===================================

    const context = connection.context as {
      documentId?: string;
      role?: string;
      tokenExpiresAt?: number;
    };

    if (context?.documentId !== documentName) {
      sendAcknowledgement(false, "Document access denied");
      return;
    }

    if (!context?.tokenExpiresAt || Date.now() >= context.tokenExpiresAt) {
      sendAcknowledgement(false, "Access token expired");
      return;
    }

    if (context.role !== "OWNER" && context.role !== "EDITOR") {
      sendAcknowledgement(
        false,
        "You do not have permission to modify document versions",
      );
      return;
    }

    try {
      // ===================================
      // SAVE CURRENT DOCUMENT STATE
      // ===================================

      if (isSaveRequest) {
        console.log(`[VERSION SAVE] Request received | ${documentName}`);

        await persistDocumentState(documentName, document);

        console.log(`[VERSION SAVE] State persisted | ${documentName}`);

        sendAcknowledgement(true);

        return;
      }

      // ===================================
      // RESTORE HISTORICAL VERSION
      // ===================================

      // ===================================
      // RESTORE HISTORICAL VERSION
      // ===================================

      if (typeof message.versionId !== "string") {
        sendAcknowledgement(false, "Missing version ID");
        return;
      }

      console.log(
        `[VERSION RESTORE] Request received | ${documentName} | ${message.versionId}`,
      );

      await withDocumentLock(documentName, async (lock) => {
        // 1. Verify lock ownership before starting.
        await assertDocumentLockOwnership(lock);

        // 2. Find the requested version belonging to this document.
        const version = await prisma.documentVersion.findFirst({
          where: {
            id: message.versionId as string,
            documentId: documentName,
          },
          select: {
            id: true,
            state: true,
          },
        });

        if (!version) {
          throw new Error("Document version not found");
        }

        // 3. Verify that we still own the lock.
        await assertDocumentLockOwnership(lock);

        // 4. Load historical Yjs state in an isolated document.
        const snapshotDoc = new Y.Doc();

        let restoredNodes: Array<Y.XmlElement | Y.XmlText>;

        try {
          Y.applyUpdate(snapshotDoc, new Uint8Array(version.state));

          const snapshotFragment = snapshotDoc.getXmlFragment("default");

          restoredNodes = snapshotFragment
            .toArray()
            .map((node) => cloneXmlNode(node));
        } finally {
          snapshotDoc.destroy();
        }

        // 5. Verify lock ownership immediately before modifying live state.
        await assertDocumentLockOwnership(lock);

        // 6. Replace the live Tiptap XML fragment atomically.
        const liveFragment = document.getXmlFragment("default");

        document.transact(() => {
          if (liveFragment.length > 0) {
            liveFragment.delete(0, liveFragment.length);
          }

          if (restoredNodes.length > 0) {
            liveFragment.insert(0, restoredNodes);
          }
        }, "collabdocs:restore-version");

        // 7. Check ownership before persisting.
        await assertDocumentLockOwnership(lock);

        // 8. Persist the restored document.
        await persistDocumentState(documentName, document);

        // 9. Confirm that the lock was not lost.
        await assertDocumentLockOwnership(lock);

        console.log(
          `[VERSION RESTORE] Successfully restored ${version.id} | ${documentName}`,
        );
      });

      // The acknowledgement is sent only after the lock is released
      // successfully by withDocumentLock's cleanup.
      sendAcknowledgement(true);
    } catch (error) {
      console.error(`[VERSION OPERATION] Failed | ${documentName}`, error);

      sendAcknowledgement(
        false,
        error instanceof Error ? error.message : "Document operation failed",
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
