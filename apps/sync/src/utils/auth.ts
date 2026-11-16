
import jwt, { type JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        "JWT_SECRET must contain at least 32 characters"
    );
}

export interface SyncUser {
    id: string;
    name: string;
    email: string;
}

export interface SyncTokenPayload extends JwtPayload {
    sub: string;
    type: "access";
}

export function verifySyncToken(
    token: string
): SyncTokenPayload {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
        typeof payload === "string" ||
        payload.type !== "access" ||
        typeof payload.sub !== "string" ||
        typeof payload.exp !== "number"
    ) {
        throw new Error("Invalid access token");
    }

    return payload as SyncTokenPayload;
}
