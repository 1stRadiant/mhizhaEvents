document.addEventListener('DOMContentLoaded', () => {
    // --- Element Variables ---
    const scriptUrlInput = document.getElementById('script-url');
    const saveUrlButton = document.getElementById('save-url');
    const managerContent = document.getElementById('manager-content');
    const addProjectForm = document.getElementById('add-project-form');
    const newProjectIdInput = document.getElementById('new-project-id');
    const newProjectPasswordInput = document.getElementById('new-project-password');
    const refreshButton = document.getElementById('refresh-btn');
    const projectsTableBody = document.getElementById('projects-table-body');
    const addLoader = document.getElementById('add-loader');
    const refreshLoader = document.getElementById('refresh-loader');

    // --- Modal Variables ---
    const passwordModal = document.getElementById('password-modal');
    const modalProjectId = document.getElementById('modal-project-id');
    const modalPasswordInput = document.getElementById('modal-password-input');
    const modalConfirmBtn = document.getElementById('modal-confirm-delete-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    let SCRIPT_URL = localStorage.getItem('scriptUrl');

    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    };

    const toggleLoader = (loader, show) => {
        loader.style.display = show ? 'inline-block' : 'none';
    };

    const fetchProjects = async () => {
        if (!SCRIPT_URL) {
            showToast('Please set your Apps Script URL first.', 'error');
            return;
        }
        toggleLoader(refreshLoader, true);
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getProjects`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            projectsTableBody.innerHTML = '';
            if (!result.projects || result.projects.length === 0) {
                projectsTableBody.innerHTML = '<tr><td colspan="4">No projects found. Add one above!</td></tr>';
            } else {
                // The Apps Script must return the password field for this to work
                result.projects.forEach(project => {
                    const row = document.createElement('tr');
                    const hasPassword = project.password ? 'Yes' : 'No';
                    row.innerHTML = `
                        <td>${project.projectId}</td>
                        <td>${project.cellLocation}</td>
                        <td><strong>${hasPassword}</strong></td>
                        <td><button class="delete" data-project-id="${project.projectId}">Delete</button></td>
                    `;
                    projectsTableBody.appendChild(row);
                });
            }
        } catch (error) {
            showToast(`Error fetching projects: ${error.message}`, 'error');
        } finally {
            toggleLoader(refreshLoader, false);
        }
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        const projectId = newProjectIdInput.value.trim();
        const password = newProjectPasswordInput.value;

        if (!projectId) {
            showToast('Project ID cannot be empty.', 'error');
            return;
        }
        toggleLoader(addLoader, true);
        try {
            const response = await fetch(`${SCRIPT_URL}?action=addProject`, {
                method: 'POST',
                body: JSON.stringify({ projectId, password }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            showToast(result.message, 'success');
            newProjectIdInput.value = '';
            newProjectPasswordInput.value = '';
            fetchProjects();
        } catch (error) {
            showToast(`Error adding project: ${error.message}`, 'error');
        } finally {
            toggleLoader(addLoader, false);
        }
    };

    const showDeleteModal = (projectId) => {
        modalProjectId.textContent = projectId;
        modalPasswordInput.value = '';
        passwordModal.style.display = 'block';
        modalPasswordInput.focus();

        modalConfirmBtn.onclick = async () => {
            const password = modalPasswordInput.value;
            passwordModal.style.display = 'none';
            try {
                const response = await fetch(`${SCRIPT_URL}?action=deleteProject`, {
                    method: 'POST',
                    body: JSON.stringify({ projectId, password }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                showToast(result.message, 'success');
                fetchProjects();
            } catch (error) {
                showToast(`Error deleting project: ${error.message}`, 'error');
            }
        };

        modalCancelBtn.onclick = () => {
            passwordModal.style.display = 'none';
        };
    };

    // --- Primary Event Listeners ---
    saveUrlButton.addEventListener('click', () => {
        const url = scriptUrlInput.value.trim();
        if (url) {
            localStorage.setItem('scriptUrl', url);
            SCRIPT_URL = url;
            managerContent.style.display = 'block';
            showToast('URL saved successfully!', 'success');
            fetchProjects();
        } else {
            showToast('Please enter a valid URL.', 'error');
        }
    });

    addProjectForm.addEventListener('submit', handleAddProject);
    refreshButton.addEventListener('click', fetchProjects);

    // This is the CRUCIAL listener. It listens for clicks on the whole table body.
    projectsTableBody.addEventListener('click', (e) => {
        // It checks if the clicked element is a button with the class 'delete'
        if (e.target && e.target.matches('button.delete')) {
            const projectId = e.target.dataset.projectId;
            showDeleteModal(projectId); // It calls the function to show the modal.
        }
    });

    // Load projects if URL is already saved
    if (SCRIPT_URL) {
        scriptUrlInput.value = SCRIPT_URL;
        managerContent.style.display = 'block';
        fetchProjects();
    }
});
```### Step 3: The Definitive Apps Script
Just in case, ensure your Apps Script `handleGetProjects` function is also returning the password.

```javascript
/**
 * Handles request to get all projects from the index.
 * UPDATED to also send back whether a password is set.
 */
function handleGetProjects() {
  const indexSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INDEX_SHEET_NAME);
  const data = indexSheet.getDataRange().getValues();
  data.shift(); // Remove header row
  const projects = data.map(row => ({ 
    projectId: row[0], 
    cellLocation: row[1],
    password: row[2] ? true : false // Send true/false for password existence
  }));
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success', projects: projects }))
    .setMimeType(ContentService.MimeType.JSON);
}
