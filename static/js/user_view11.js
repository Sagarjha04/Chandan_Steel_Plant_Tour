/**
 * Custom Modal Overlay Engine
 * Spawns interactive popups instead of native alert/confirm boxes
 */
const CustomModalOverlayEngine = {
    /**
     * Spawns an interactive custom centered confirmation popup instead of native alert boxes
     * @param {string} reportId - The unique database entry row ID token
     * @param {function} onConfirmCallback - The operational function chain to run upon confirmation
     */
    spawnConfirm: function(reportId, onConfirmCallback) {
        this.dismiss();
        
        // Assemble dynamic overlay layout components tree
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.id = 'dynamic-factory-alert-overlay';
        overlay.innerHTML = `
            <div class="custom-modal-box">
                <div class="modal-icon-badge">⚠️</div>
                <h3 class="modal-content-title">Confirm Record Deletion</h3>
                <p class="modal-content-desc">Are you absolutely sure you want to delete Report Entry #${reportId} permanently from the database ledger columns?</p>
                <div class="modal-btn-grid">
                    <button type="button" class="modal-action-btn modal-btn-cancel" onclick="CustomModalOverlayEngine.dismiss()">Cancel Action</button>
                    <button type="button" class="modal-action-btn modal-btn-confirm" id="modal-confirm-action-trigger">Delete Record</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Trigger smooth fade-in scaling transitions animation frames
        setTimeout(() => overlay.classList.add('modal-active-state'), 30);
        
        // Bind dynamic processing handlers straight to click elements parameters
        document.getElementById('modal-confirm-action-trigger').onclick = () => {
            this.dismiss();
            onConfirmCallback();
        };
    },
    
    /**
     * Spawns an interactive custom centered action complete success popups container box
     * @param {string} msg - The verification narrative text layout statement string
     */
    spawnSuccess: function(msg) {
        this.dismiss();
        
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.id = 'dynamic-factory-alert-overlay';
        overlay.innerHTML = `
            <div class="custom-modal-box profile-success">
                <div class="modal-icon-badge">✅</div>
                <h3 class="modal-content-title">Action Complete</h3>
                <p class="modal-content-desc">${msg}</p>
                <button type="button" class="modal-action-btn" onclick="CustomModalOverlayEngine.dismiss()">Dismiss Notification</button>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('modal-active-state'), 30);
    },
    
    /**
     * Cleans up running alert modal elements safely out of active memory layouts
     */
    dismiss: function() {
        const modal = document.getElementById('dynamic-factory-alert-overlay');
        if (modal) {
            modal.classList.remove('modal-active-state');
            setTimeout(() => { if(modal.parentNode) modal.remove(); }, 250);
        }
    }
};

/**
 * Initiates the UI warning popup for purging ledger entries
 */
function triggerLedgerRecordPurge(reportId, dateGroupStr) {
    // Override default window.confirm block with our high-visibility premium color popup box modal
    CustomModalOverlayEngine.spawnConfirm(reportId, () => {
        executeSecureAsynchronousPurge(reportId, dateGroupStr);
    });
}

/**
 * Handles backend fetch requests and dynamic frontend grid updates
 */
function executeSecureAsynchronousPurge(reportId, dateGroupStr) {
    fetch(`/admin/delete_report/${reportId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const targetRow = document.getElementById(`ledger-scan-row-node-${reportId}`);
            if (targetRow) {
                // Run smooth sliding extraction transitions fadeout animations blocks
                targetRow.style.transition = "all 0.3s ease";
                targetRow.style.opacity = "0";
                targetRow.style.transform = "scale(0.95)";
                
                setTimeout(() => {
                    targetRow.remove();
                    
                    const groupBadge = document.getElementById(`group-badge-counter-${dateGroupStr}`);
                    const groupParentContainer = document.getElementById(`day-timeline-group-node-${dateGroupStr}`);
                    
                    // Re-calculate daily transaction grouping numbers values counters text labels
                    if (groupBadge && groupParentContainer) {
                        let dynamicRemainingCount = parseInt(groupBadge.innerText) - 1;
                        groupBadge.innerText = dynamicRemainingCount;
                        if (dynamicRemainingCount <= 0) {
                            groupParentContainer.style.transition = "all 0.3s ease";
                            groupParentContainer.style.opacity = "0";
                            setTimeout(() => { groupParentContainer.remove(); }, 300);
                        }
                    }
                    
                    // Re-calculate total profile aggregate metrics numbers tracker badge counter
                    const lifetimeDisplay = document.getElementById("lifetime-total-count-display");
                    if (lifetimeDisplay) {
                        let activeVal = parseInt(lifetimeDisplay.innerText.replace(/[^0-9]/g, '')) - 1;
                        lifetimeDisplay.innerHTML = `<strong>${activeVal} Records</strong>`;
                    }
                    
                    // Launch beautiful corporate emerald modal alert for successful drops
                    CustomModalOverlayEngine.spawnSuccess(`Record Log Entry #${reportId} removed successfully from database layout configurations.`);
                }, 300);
            }
        } else {
            alert(`Deletion Pipeline Warning: ${data.message || 'Server dropped connection.'}`);
        }
    })
    .catch(err => {
        console.error("AJAX Error Exception Context:", err);
        alert("Server transmission failure. Check database routes configurations connectivity.");
    });
}
