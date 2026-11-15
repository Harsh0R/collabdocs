
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

dotenv.config({ path: "../../.env" });

const app = express();

const PORT = Number(process.env.API_PORT) || 4000;

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(morgan("dev"));

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "CollabDocs API",
    message: "Welcome to CollabDocs!",
    version: "1.0.0",
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "collabdocs-api",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`CollabDocs API running at http://localhost:${PORT}`);
});
