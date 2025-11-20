import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { retry } from "./retry";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5001" // локально
    : "https://<твой-backend>.railway.app"); // прод

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  // Если URL относительный — подставляем базовый адрес
  const fullUrl = url.startsWith("http")
    ? url
    : `${API_BASE}${url}`;

  return retry(async () => {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  }, {
    maxRetries: 10,
    retryDelay: 1000,
    shouldRetry: (error) => {
      // Повторяем для сетевых ошибок и ошибок сервера (5xx), но не для клиентских ошибок (4xx)
      if (error instanceof Error) {
        // Сетевые ошибки
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          return true;
        }
        // Ошибки сервера (5xx)
        if (error.message.match(/^5\d{2}:/)) {
          return true;
        }
        // Rate limiting (429) - повторяем
        if (error.message.match(/^429:/)) {
          return true;
        }
      }
      return false;
    },
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Повторяем для сетевых ошибок и ошибок сервера (5xx), но не для клиентских ошибок (4xx)
        if (failureCount >= 3) return false;
        if (error instanceof Error) {
          // Сетевые ошибки
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return true;
          }
          // Ошибки сервера (5xx)
          if (error.message.match(/^5\d{2}:/)) {
            return true;
          }
          // Rate limiting (429) - повторяем
          if (error.message.match(/^429:/)) {
            return true;
          }
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Для мутаций повторяем только сетевые ошибки и 5xx
        if (failureCount >= 2) return false;
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return true;
          }
          if (error.message.match(/^5\d{2}:/)) {
            return true;
          }
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});
