
import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "JWT_SECRET must contain at least 32 characters"
    );
}

export interface AccessTokenPayload extends JwtPayload {
    sub: string;
    type: "access";
}

export function generateAccessToken(userId: string): string {
    return jwt.sign(
        {
            sub: userId,
            type: "access",
        },
        JWT_SECRET,
        {
            expiresIn: "15m",
        }
    );
}

export function verifyAccessToken(
    token: string
): AccessTokenPayload {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
        typeof payload === "string" ||
        payload.type !== "access" ||
        typeof payload.sub !== "string"
    ) {
        throw new Error("Invalid access token");
    }

    return payload as AccessTokenPayload;
}

export function generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}
