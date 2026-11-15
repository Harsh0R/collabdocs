
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
} from "../utils/token.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const SALT_ROUNDS = 12;

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export async function registerUser(input: RegisterInput) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(
        input.password,
        SALT_ROUNDS
    );

    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    });

    const tokens = await issueTokens(user.id);

    return {
        user,
        ...tokens,
    };
}

export async function loginUser(input: LoginInput) {
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email },
    });

    // Use a generic error to avoid revealing whether an email exists.
    if (!user) {
        throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(
        input.password,
        user.passwordHash
    );

    if (!passwordMatches) {
        throw new AppError("Invalid email or password", 401);
    }

    const tokens = await issueTokens(user.id);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        },
        ...tokens,
    };
}

async function issueTokens(userId: string) {
    const accessToken = generateAccessToken(userId);

    const refreshToken = generateRefreshToken();

    const tokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(
        Date.now() +
        REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.refreshToken.create({
        data: {
            tokenHash,
            userId,
            expiresAt,
        },
    });

    return {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
    };
}

export async function refreshAccessToken(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
    });

    if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= new Date()
    ) {
        throw new AppError("Invalid or expired refresh token", 401);
    }

    const newRefreshToken = generateRefreshToken();

    const newTokenHash = hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date(
        Date.now() +
        REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    // Rotate atomically: the old token can only be consumed once.
    const result = await prisma.$transaction(async (tx) => {
        const revoked = await tx.refreshToken.updateMany({
            where: {
                id: storedToken.id,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: {
                revokedAt: new Date(),
            },
        });

        if (revoked.count !== 1) {
            throw new AppError("Refresh token already used", 401);
        }

        await tx.refreshToken.create({
            data: {
                tokenHash: newTokenHash,
                userId: storedToken.userId,
                expiresAt: newExpiresAt,
            },
        });

        return {
            accessToken: generateAccessToken(storedToken.userId),
            refreshToken: newRefreshToken,
            accessTokenExpiresIn: ACCESS_TOKEN_EXPIRY,
        };
    });

    return result;
}

export async function logoutUser(refreshToken?: string) {
    if (!refreshToken) {
        return;
    }

    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.refreshToken.updateMany({
        where: {
            tokenHash,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
}

export async function getUserById(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return user;
}
