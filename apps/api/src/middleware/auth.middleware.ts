
import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { verifyAccessToken } from "../utils/token.js";

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            status: "error",
            message: "Authentication required",
        });
    }

    const token = authorization.slice(7);

    try {
        const payload = verifyAccessToken(token);

        req.user = {
            id: payload.sub,
        };

        next();
    } catch {
        return res.status(401).json({
            status: "error",
            message: "Invalid or expired access token",
        });
    }
}
