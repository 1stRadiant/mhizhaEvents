document.addEventListener('DOMContentLoaded', () => {
    const scriptUrlInput = document.getElementById('script-url');
    const saveUrlButton = document.getElementById('save-url');
    const managerContent = document.getElementById('manager-content');
    const addProjectForm = document.getElementById('add-project-form');
    const newProjectIdInput = document.getElementById('new-project-id');
    const refreshButton = document.getElementById('refresh-btn');
    const projectsTableBody = document.getElementById('projects-table-body');
    const addLoader = document.getElementById('add-loader');
    const refreshLoader = document.getElementById('refresh-loader');

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
                projectsTableBody.innerHTML = '<tr><td colspan="3">No projects found.</td></tr>';
            } else {
                result.projects.forEach(project => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${project.projectId}</td>
                        <td>${project.cellLocation}</td>
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
        if (!projectId) {
            showToast('Project ID cannot be empty.', 'error');
            return;
        }
        toggleLoader(addLoader, true);
        try {
            const response = await fetch(`${SCRIPT_URL}?action=addProject`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                body: JSON.stringify({ projectId }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            showToast(result.message, 'success');
            newProjectIdInput.value = '';
            fetchProjects();
        } catch (error) {
            showToast(`Error adding project: ${error.message}`, 'error');
        } finally {
            toggleLoader(addLoader, false);
        }
    };

    const handleDeleteProject = async (e) => {
        if (!e.target.matches('button.delete')) return;
        const projectId = e.target.dataset.projectId;
        if (!confirm(`Are you sure you want to delete the project "${projectId}"? This will also delete its data.`)) {
            return;
        }

        e.target.disabled = true;
        e.target.textContent = 'Deleting...';
        
        try {
            const response = await fetch(`${SCRIPT_URL}?action=deleteProject`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                body: JSON.stringify({ projectId }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message);

            showToast(result.message, 'success');
            fetchProjects();
        } catch (error) {
            showToast(`Error deleting project: ${error.message}`, 'error');
            e.target.disabled = false;
            e.target.textContent = 'Delete';
        }
    };

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

    if (SCRIPT_URL) {
        scriptUrlInput.value = SCRIPT_URL;
        managerContent.style.display = 'block';
        fetchProjects();
    }
    
    addProjectForm.addEventListener('submit', handleAddProject);
    refreshButton.addEventListener('click', fetchProjects);
    projectsTableBody.addEventListener('click', handleDeleteProject);
});
