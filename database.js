// IMPORTANT: Replace this URL with your Google Apps Script Web App URL.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNGS8NC9l5hZ1demFyKNMHoaGIlacHKyz0P3Z3dvOb3jOkp7qjup2oCrqIuWXTkvYk/exec";

class Database {
    constructor() {
        this.data = null;
        this.isFetching = false;
        this.fetchPromise = null;
        this.saveQueue = Promise.resolve();
    }

    async init() {
        if (this.isFetching) {
            return this.fetchPromise;
        }
        if (this.data === null) {
            console.log("Fetching initial data from Google Sheets...");
            this.isFetching = true;
            this.fetchPromise = fetch(SCRIPT_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.status !== 'success') {
                         throw new Error(`Google Sheets API Error: ${result.message}`);
                    }
                    // The actual app data is in the 'data' property of the response
                    this.data = result.data || {};
                    console.log("Data fetched successfully:", this.data);
                    this.isFetching = false;
                    return this.data;
                })
                .catch(error => {
                    console.error("Failed to fetch data from Google Sheets:", error);
                    alert("Error: Could not connect to the database. Please check your Google Apps Script setup and URL. Some features may not work correctly.");
                    // Fallback to a minimal structure to prevent errors
                    this.data = { announcements: [], gallery: [], inquiries: [], volunteers: [], messages: [], events: [], projects: [], adminCredentials: {username:'admin', password:'admin123'} }; 
                    this.isFetching = false;
                });
            return this.fetchPromise;
        }
        return Promise.resolve(this.data);
    }

    async getItem(key, defaultValue = null) {
        await this.init();
        if (!this.data) {
            return defaultValue;
        }
        // Use a deep copy for objects and arrays to prevent mutation issues
        const value = this.data.hasOwnProperty(key) ? this.data[key] : defaultValue;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return value;
        }
    }

    async setItem(key, value) {
        await this.init();
        if (!this.data) return;
        this.data[key] = value;
        // The save operation is queued to prevent race conditions.
        // We call it without awaiting to let the UI continue, providing a non-blocking experience.
        this.saveData();
        return Promise.resolve(); // Resolve immediately.
    }

    saveData() {
        // Chain save operations to ensure they run sequentially
        this.saveQueue = this.saveQueue.then(async () => {
            if (!SCRIPT_URL) {
                console.warn("Database not configured. Data is not being persisted. Please set SCRIPT_URL in database.js");
                return;
            }
            console.log("Saving data to Google Sheets...");
            try {
                // To ensure Apps Script's doPost can parse the data, we'll send it as a raw JSON string
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    body: JSON.stringify(this.data), // Sending as a raw JSON string
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8',
                    },
                    redirect: 'follow',
                });

                 if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.status !== 'success') {
                     throw new Error(`Google Script Error: ${result.message || 'Unknown error saving data.'}`);
                }
                console.log("Data saved successfully.");
                if (window.showToast) {
                    window.showToast("Data saved successfully to your spreadsheet!", 'success');
                }
            } catch (error) {
                console.error("Failed to save data to Google Sheets:", error);
                if (window.showToast) {
                    window.showToast("Error: Could not save data. Your changes might not persist.", 'danger');
                } else {
                    alert("Error: Could not save data to the database. Your changes might not persist.");
                }
            }
        }).catch(err => {
            console.error("Error in save queue:", err);
            // Reset queue
            this.saveQueue = Promise.resolve();
        });
        return this.saveQueue;
    }
}

export const db = new Database();