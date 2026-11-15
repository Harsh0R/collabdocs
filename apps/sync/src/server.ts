
import dotenv from "dotenv";
import { Server } from "@hocuspocus/server";

dotenv.config({ path: "../../.env" });

const PORT = Number(process.env.SYNC_PORT) || 1234;

const server = new Server({
    port: PORT,

    name: "collabdocs-sync",

    async onConnect({ documentName }) {
        console.log(`Client connected to document: ${documentName}`);
    },

    async onDisconnect({ documentName }) {
        console.log(`Client disconnected from document: ${documentName}`);
    },
});

server.listen();

console.log(`CollabDocs Sync Server starting on port ${PORT}`);
