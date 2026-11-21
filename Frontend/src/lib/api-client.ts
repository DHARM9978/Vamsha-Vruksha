
const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "vv.auth.token";

// ======================================================
// API RESPONSE TYPES
// ======================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  requestId?: string;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  requestId?: string;
}

// ======================================================
// API ERROR CLASS
// ======================================================

export class ApiError extends Error {
  status: number;
  requestId: string | undefined;

  constructor(
    message: string,
    status: number,
    requestId?: string
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ======================================================
// TOKEN MANAGEMENT
// ======================================================

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  set(token: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      throw new Error("Unable to save authentication token.");
    }
  },

  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors during logout.
    }
  },
};

// ======================================================
// REQUEST CONFIGURATION
// ======================================================

export interface ApiRequestOptions
  extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

// ======================================================
// CORE API REQUEST
// ======================================================

async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    body,
    auth = true,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  const url = `${API_BASE_URL}/${normalizedEndpoint}`;

  const headers = new Headers(customHeaders);

  headers.set("Accept", "application/json");

  // Attach JWT when authentication is enabled.
  if (auth) {
    const token = tokenStorage.get();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob
    ) {
      requestBody = body;
    } else if (typeof body === "string") {
      requestBody = body;
      headers.set("Content-Type", "application/json");
    } else {
      requestBody = JSON.stringify(body);
      headers.set("Content-Type", "application/json");
    }
  }

  // Build RequestInit without assigning undefined to body.
  const requestConfig: RequestInit = {
    ...fetchOptions,
    headers,
  };

  if (requestBody !== undefined) {
    requestConfig.body = requestBody;
  }

  let response: Response;

  try {
    response = await fetch(url, requestConfig);
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Please check your backend connection.",
      0
    );
  }

  let responseData: unknown;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const errorData = (
      responseData &&
      typeof responseData === "object"
        ? responseData
        : {}
    ) as ApiErrorResponse;

    if (response.status === 401 && auth) {
      tokenStorage.clear();
    }

    throw new ApiError(
      errorData.message ||
        `Request failed with status ${response.status}`,
      response.status,
      errorData.requestId
    );
  }

  return responseData as T;
}

// ======================================================
// HTTP METHODS
// ======================================================

export const api = {
  get<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "POST",
      body,
    });
  },

  put<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "PUT",
      body,
    });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body,
    });
  },

  delete<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, "body" | "method"> = {}
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};

// ======================================================
// API CONFIGURATION
// ======================================================

export const apiConfig = {
  baseURL: API_BASE_URL,
};
