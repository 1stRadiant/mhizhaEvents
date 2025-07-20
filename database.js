// IMPORTANT: Replace this URL with your NEW Google Apps Script Web App URL.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd83dxYJvSLra3t3fAd13Crpc1vByNIxS3YaN32gnTTGilMr2jq3WfIUxf42LWl-hU/exec";

class Database {
    constructor(projectId) {
        if (!projectId) {
            // This error is now more important than ever!
            throw new Error("A projectId is required to initialize the database.");
        }
        this.projectId = projectId;
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
            console.log(`Fetching initial data for project "${this.projectId}"...`);
            this.isFetching = true;
            // Append projectId to the GET request URL
            this.fetchPromise = fetch(`${SCRIPT_URL}?projectId=${this.projectId}`)
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
                    this.data = result.data || {};
                    console.log("Data fetched successfully:", this.data);
                    this.isFetching = false;
                    return this.data;
                })
                .catch(error => {
                    console.error("Failed to fetch data from Google Sheets:", error);
                    alert(`Error: Could not connect to the database for project "${this.projectId}". Please check your setup. Some features may not work.`);
                    // Fallback to a minimal structure
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
        this.saveData();
        return Promise.resolve();
    }

    saveData() {
        this.saveQueue = this.saveQueue.then(async () => {
            if (!SCRIPT_URL) {
                console.warn("Database not configured. Data is not being persisted.");
                return;
            }
            console.log(`Saving data for project "${this.projectId}"...`);

            const dataToSave = JSON.parse(JSON.stringify(this.data));
            delete dataToSave.isAdminLoggedIn;
            delete dataToSave.currentVolunteer;

            try {
                // Append projectId to the POST request URL
                const response = await fetch(`${SCRIPT_URL}?projectId=${this.projectId}&action=saveData`, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    body: JSON.stringify(dataToSave),
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
            this.saveQueue = Promise.resolve();
        });
        return this.saveQueue;
    }
}

// ✅ Correct: The Database CLASS is exported.
// This allows other files to use `import { Database } from './database.js';`
export { Database };
