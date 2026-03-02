const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'https://v37sv045-8080.inc1.devtunnels.ms'}/api/v1`;

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    // If run on client, attempt to grab token from localStorage
    let token = '';
    if (typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
    }

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'An error occurred during API request');
    }

    return response.json();
}
