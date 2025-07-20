document.addEventListener('DOMContentLoaded', () => {
    // --- Input and Button Variables ---
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
            if (result.projects.length === 0) {
                projectsTableBody.innerHTML = '<tr><td colspan="3">No projects found. Add one above!</td></tr>';
            } else {
                result.projects.forEach(project => {
                    const row = document.createElement('tr');
                    // We check if a password is set to show an indicator
                    const hasPassword = project.password ? 'Yes' : 'No';
                    row.innerHTML = `
                        <td>${project.projectId}</td>
                        <td>${project.cellLocation}</td>
                        <td>Password Set: <strong>${hasPassword}</strong></td>
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

    // --- THIS IS THE CORRECTED DELETE LOGIC ---
    // This function shows the modal and sets up the confirm/cancel actions.
    const showDeleteModal = (projectId) => {
        modalProjectId.textContent = projectId;
        modalPasswordInput.value = '';
        passwordModal.style.display = 'block';
        modalPasswordInput.focus();

        // When the user clicks "Confirm Delete" inside the modal
        modalConfirmBtn.onclick = async () => {
            const password = modalPasswordInput.value;
            // The password can be an empty string if none was set, so we don't check for !password
            
            passwordModal.style.display = 'none'; // Hide modal immediately
            
            try {
                const response = await fetch(`${SCRIPT_URL}?action=deleteProject`, {
                    method: 'POST',
                    body: JSON.stringify({ projectId, password }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });

                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);

                showToast(result.message, 'success');
                fetchProjects(); // Refresh list on success
            } catch (error) {
                showToast(`Error deleting project: ${error.message}`, 'error');
            }
        };

        // When the user clicks "Cancel"
        modalCancelBtn.onclick = () => {
            passwordModal.style.display = 'none';
        };
    };


    // --- EVENT LISTENERS ---

    // Save the Script URL
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

    // Handle form submission for adding a project
    addProjectForm.addEventListener('submit', handleAddProject);

    // Handle refresh button click
    refreshButton.addEventListener('click', fetchProjects);

    // Main event listener for the table. It now calls the modal function.
    projectsTableBody.addEventListener('click', (e) => {
        if (e.target && e.target.matches('button.delete')) {
            const projectId = e.target.dataset.projectId;
            showDeleteModal(projectId);
        }
    });

    // Load projects if URL is already saved in local storage
    if (SCRIPT_URL) {
        scriptUrlInput.value = SCRIPT_URL;
        managerContent.style.display = 'block';
        fetchProjects();
    }
});
