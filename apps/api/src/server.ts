
import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

const PORT = Number(process.env.API_PORT) || 4000;

// Security
app.use(helmet());

// CORS
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Logging
app.use(morgan("dev"));

// Root
app.get("/", (_req, res) => {
    res.json({
        name: "CollabDocs API",
        message: "Welcome to CollabDocs!",
        version: "1.0.0",
    });
});

// API health
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "collabdocs-api",
        timestamp: new Date().toISOString(),
    });
});

// Database health
app.get("/health/db", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: "ok",
            service: "collabdocs-api",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Database connection failed:", error);

        res.status(503).json({
            status: "error",
            database: "disconnected",
        });
    }
});

// Authentication APIs
app.use("/api/auth", authRoutes);

// User APIs
app.use("/api/users", userRoutes);

// Unknown routes
app.use((_req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found",
    });
});

// Central error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(
        `CollabDocs API running at http://localhost:${PORT}`
    );
});
