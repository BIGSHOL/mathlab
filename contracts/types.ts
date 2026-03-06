/** Common API response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
  };
}

/** Common API error response */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
