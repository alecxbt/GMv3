// Centralized error handling for API calls

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function handleApiError(error: any): ApiError {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || error.response.data?.error || 'Server error',
      status: error.response.status,
      code: error.response.data?.code,
    };
  } else if (error.request) {
    // Request made but no response received
    return {
      message: 'No response from server. Is the backend running?',
      code: 'NETWORK_ERROR',
    };
  } else {
    // Error setting up request
    return {
      message: error.message || 'Unknown error occurred',
      code: 'REQUEST_ERROR',
    };
  }
}

export function isNetworkError(error: any): boolean {
  return error.code === 'NETWORK_ERROR' || 
         error.code === 'ECONNREFUSED' ||
         error.message?.includes('Network Error') ||
         !error.response;
}

