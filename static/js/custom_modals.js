/**
 * Factory Dashboard Universal Modal Alert Pipeline Manager Engine
 */
const ModalAlertManager = {
    /**
     * Spawns an interactive custom centered modal dynamically inside the active view
     * @param {string} title - The main prominent title string header
     * @param {string} message - The contextual descriptive statement block
     * @param {('success'|'exists'|'error')} type - The specific vibrant color profile schema to target
     */
    trigger: function(title, message, type = 'success') {
        // Destroy existing modals if any remain stuck in memory
        this.dismissAllActiveInstances();

        // Create universal container elements array structures
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.id = 'dynamic-factory-alert-overlay';

        // Select correct visual icon anchor mappings context
        let iconSymbol = '⚡';
        if (type === 'success') iconSymbol = '✅';
        if (type === 'exists') iconSymbol = '⚠️';
        if (type === 'error') iconSymbol = '❌';

        // Assemble clean responsive string components nodes structural templates
        overlay.innerHTML = `
            <div class="custom-modal-box profile-${type}">
                <div class="modal-icon-badge">${iconSymbol}</div>
                <h3 class="modal-content-title">${title}</h3>
                <p class="modal-content-desc">${message}</p>
                <button type="button" class="modal-dismiss-btn" onclick="ModalAlertManager.dismissAllActiveInstances()">Dismiss Notification</button>
            </div>
        `;

        // Inject framework layers straight into active layout windows tree configuration
        document.body.appendChild(overlay);

        // Force browser display engine loop re-calculations state update to handle smooth animations
        setTimeout(() => {
            overlay.classList.add('modal-active-state');
        }, 30);
    },

    /**
     * Cleans up running alert instances safely out of active memory logs
     */
    dismissAllActiveInstances: function() {
        const structuralAlertNode = document.getElementById('dynamic-factory-alert-overlay');
        if (structuralAlertNode) {
            structuralAlertNode.classList.remove('modal-active-state');
            // Remove DOM tree footprint completely after closing animation fades out
            setTimeout(() => {
                if (structuralAlertNode.parentNode) {
                    structuralAlertNode.parentNode.removeChild(structuralAlertNode);
                }
            }, 250);
        }
    }
};

// =====================================================================
// AUTOMATIC HOOK ENGINE: Auto-triggers modals from hidden Jinja elements
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Read hidden verification parameters populated from app.py post requests loops
    const errorNode = document.getElementById('flask-backend-error-data');
    const successNode = document.getElementById('flask-backend-success-data');

    if (errorNode && errorNode.value.trim() !== "") {
        const errorText = errorNode.value.trim();
        // Route category parameters to launch specific profiles profiles entries
        if (errorText.includes("taken") || errorText.includes("Exists")) {
            ModalAlertManager.trigger("⚠️ Node Already Exists", errorText, "exists");
        } else {
            ModalAlertManager.trigger("❌ Transaction Exception Blocked", errorText, "error");
        }
    } else if (successNode && successNode.value.trim() !== "") {
        ModalAlertManager.trigger("✅ Registration Confirmed", successNode.value.trim(), "success");
    }
});
