/**
 * Factory Control Dashboard - Real-time Ledger Filter Search Engine
 */
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("ledger-live-search-input");
    const counterBadge = document.getElementById("search-counter-badge");
    
    // Locate target table body structural layout boundaries safely
    const tableContainer = document.querySelector(".ledger-table-container table");
    if (!tableContainer || !searchInput || !counterBadge) return; // Crash safeguard barrier protection
    
    const tableRows = tableContainer.querySelectorAll("tbody tr");
    
    /**
     * Re-calculates and renders the live visibility parameters metrics entry strip text
     */
    function updateLedgerRowCounters() {
        let visibleCount = 0;
        let totalCount = 0;
        
        tableRows.forEach(row => {
            // Exclude empty table/no-data fallback placeholder notifications from being counted
            if (row.cells.length > 1) {
                totalCount++;
                if (row.style.display !== "none") {
                    visibleCount++;
                }
            }
        });
        
        counterBadge.innerText = `Showing: ${visibleCount} / ${totalCount}`;
    }

    // Run once upon initial tab construction payload loading to render initial counts
    updateLedgerRowCounters();

    // Bind clean keyup event framework listeners to capture active input query variables
    searchInput.addEventListener("keyup", (event) => {
        const queryText = event.target.value.toLowerCase().trim();
        
        tableRows.forEach(row => {
            // Ensure we skip processing fallback status notification lines fields
            if (row.cells.length <= 1) return;
            
            // Map text arrays extracted selectively out of rows columns coordinates
            const workerId = row.cells[1] ? row.cells[1].innerText.toLowerCase() : "";
            const workerName = row.cells[2] ? row.cells[2].innerText.toLowerCase() : "";
            const plantSpace = row.cells[3] ? row.cells[3].innerText.toLowerCase() : "";
            const scanPayload = row.cells[4] ? row.cells[4].innerText.toLowerCase() : "";
            const pointRemarks = row.cells[8] ? row.cells[8].innerText.toLowerCase() : "";
            
            // Perform loose match verification check parameters arrays
            const isMatchFound = workerId.includes(queryText) || 
                                 workerName.includes(queryText) || 
                                 plantSpace.includes(queryText) || 
                                 scanPayload.includes(queryText) ||
                                 pointRemarks.includes(queryText);
                                 
            // Toggle visibility dynamically layout blocks without triggering page reloads
            if (isMatchFound) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
        
        // Refresh display counters badge parameters tracking string array values
        updateLedgerRowCounters();
    });
});
/**
 * Factory Control Center - Premium Centered Modal Display Engine
 */
const ModalAlertManager = {
    /**
     * Spawns an interactive custom centered modal dynamically inside the active view
     * @param {string} title - The main prominent title string header
     * @param {string} message - The contextual descriptive statement block
     * @param {('success'|'error')} type - The specific vibrant color profile schema to target
     */
    trigger: function(title, message, type = 'success') {
        this.clear();

        // Create the structural elements
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.id = 'dynamic-factory-alert-overlay';

        let symbol = (type === 'success') ? '✅' : '❌';

        overlay.innerHTML = `
            <div class="custom-modal-box profile-${type}">
                <div class="modal-icon-badge">${symbol}</div>
                <h3 class="modal-content-title">${title}</h3>
                <p class="modal-content-desc">${message}</p>
                <button type="button" class="modal-dismiss-btn" onclick="ModalAlertManager.clear()">Dismiss Notification</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Force browser engine runtime update to execute the scale smooth bounce animation
        setTimeout(() => {
            overlay.classList.add('modal-active-state');
        }, 30);
    },

    /**
     * Safely drops running alert instances out of DOM memory nodes
     */
    clear: function() {
        const modalElement = document.getElementById('dynamic-factory-alert-overlay');
        if (modalElement) {
            modalElement.classList.remove('modal-active-state');
            setTimeout(() => {
                if (modalElement.parentNode) {
                    modalElement.parentNode.removeChild(modalElement);
                }
            }, 250);
        }
    }
};
