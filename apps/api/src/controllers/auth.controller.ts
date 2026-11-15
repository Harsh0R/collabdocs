
import type { Request, Response } from "express";
import { z } from "zod";

import {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
} from "../services/auth.service.js";

const REFRESH_COOKIE = "collabdocs_refresh";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/api/auth",
};

const refreshCookieMaxAge = 7 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
});

const loginSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(72),
});

export async function registerController(
    req: Request,
    res: Response
) {
    const input = registerSchema.parse(req.body);

    const result = await registerUser(input);

    res.cookie(
        REFRESH_COOKIE,
        result.refreshToken,
        {
            ...cookieOptions,
            maxAge: refreshCookieMaxAge,
        }
    );

    res.status(201).json({
        status: "success",
        message: "Account created successfully",
        data: {
            user: result.user,
            accessToken: result.accessToken,
            accessTokenExpiresIn: result.accessTokenExpiresIn,
        },
    });
}

export async function loginController(
    req: Request,
    res: Response
) {
    const input = loginSchema.parse(req.body);

    const result = await loginUser(input);

    res.cookie(
        REFRESH_COOKIE,
        result.refreshToken,
        {
            ...cookieOptions,
            maxAge: refreshCookieMaxAge,
        }
    );

    res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
            user: result.user,
            accessToken: result.accessToken,
            accessTokenExpiresIn: result.accessTokenExpiresIn,
        },
    });
}

export async function refreshController(
    req: Request,
    res: Response
) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
        return res.status(401).json({
            status: "error",
            message: "Refresh token missing",
        });
    }

    const result = await refreshAccessToken(refreshToken);

    res.cookie(
        REFRESH_COOKIE,
        result.refreshToken,
        {
            ...cookieOptions,
            maxAge: refreshCookieMaxAge,
        }
    );

    return res.status(200).json({
        status: "success",
        message: "Token refreshed successfully",
        data: {
            accessToken: result.accessToken,
            accessTokenExpiresIn: result.accessTokenExpiresIn,
        },
    });
}

export async function logoutController(
    req: Request,
    res: Response
) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    await logoutUser(refreshToken);

    res.clearCookie(
        REFRESH_COOKIE,
        cookieOptions
    );

    return res.status(200).json({
        status: "success",
        message: "Logged out successfully",
    });
}
