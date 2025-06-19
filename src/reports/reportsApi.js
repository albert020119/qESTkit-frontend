// API functions for reports
const API_BASE_URL = "http://localhost:8000";

export const createReport = async (code, message) => {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, message })
  });
  
  if (!response.ok) {
    throw new Error("Failed to create report");
  }
  
  return response.json();
};

export const getReports = async () => {
  const response = await fetch(`${API_BASE_URL}/reports`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }
  
  return response.json();
};
