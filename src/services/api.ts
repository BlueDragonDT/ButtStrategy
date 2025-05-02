// Core API functionality

/**
 * Base API client with common functionality
 */
export const fetchWithErrorHandling = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log("errorData", errorData);

      throw new Error(`HTTP error! status: ${response.status}; url: ${url}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}; 