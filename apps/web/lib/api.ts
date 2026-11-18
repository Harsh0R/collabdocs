// apps/web/src/lib/api.ts


const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function getAccessToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return sessionStorage.getItem("accessToken");
}

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAccessToken();

    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
                ...options.headers,
            },

            credentials: "include",
        }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(
            result.message || "Something went wrong",
            response.status
        );
    }

    return result as T;
}