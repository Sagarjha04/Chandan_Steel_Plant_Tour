// dashboard.js - Factory Dashboard Admin UI Controller (Part 1)

function handleAdminPlantDropdownChange(dropdownElement) {
    const pId = dropdownElement.value;
    const hiddenId = document.getElementById('hidden_plant_id_db') || document.getElementById('hidden_plant_id');
    const hiddenName = document.getElementById('hidden_plant_name_db') || document.getElementById('hidden_plant_name');
    const ptSelect = document.getElementById('point_select_db') || document.getElementById('point_select');
    
    if (!ptSelect) return;
    const activeOpt = dropdownElement.options[dropdownElement.selectedIndex];
    
    if (!pId) {
        ptSelect.innerHTML = '<option value="">-- Select Facility First --</option>';
        ptSelect.disabled = true;
        if (hiddenId) hiddenId.value = '';
        if (hiddenName) hiddenName.value = '';
        return;
    }
    
    if (hiddenId) hiddenId.value = pId;
    if (hiddenName) hiddenName.value = activeOpt.getAttribute('data-name') || '';

    ptSelect.innerHTML = '<option value="">-- Synchronizing Checkpoints... --</option>';
    ptSelect.disabled = true;

    fetch(`/get_checkpoints/${encodeURIComponent(pId)}`)
        .then(res => res.json())
        .then(pointsArray => {
            ptSelect.innerHTML = '<option value="">-- Choose Checkpoint Location Name --</option>';
            
            const newCustomOpt = document.createElement('option');
            newCustomOpt.value = "CREATE_NEW";
            newCustomOpt.style.color = "#0d6efd";
            newCustomOpt.style.fontWeight = "bold";
            newCustomOpt.textContent = "[+] Create New Custom Checkpoint...";
            ptSelect.appendChild(newCustomOpt);

            pointsArray.forEach(item => {
                const optNode = document.createElement('option');
                optNode.value = item.point_name;
                
                if (item.is_created === 1) {
                    optNode.textContent = item.point_name + " (⚠️ Already Created)";
                    optNode.disabled = true; 
                    optNode.style.color = "#adb5bd";
                } else {
                    optNode.textContent = item.point_name;
                    optNode.disabled = false;
                    optNode.style.color = "#333";
                }
                ptSelect.appendChild(optNode);
            });
            ptSelect.disabled = false;
        })
        .catch(err => {
            console.error("Failure synchronizing checkpoints repository:", err);
            ptSelect.innerHTML = '<option value="">⚠️ Error loading checkpoint items</option>';
        });
}

function syncPlantFormFields(dropdownElement) {
    handleAdminPlantDropdownChange(dropdownElement);
}

function handleAdminCheckpointDropdownChange(dropdownElement) {
    if (dropdownElement.value === "CREATE_NEW") {
        showCenteredPromptModal(dropdownElement);
    }
}

function executeAssetRemovalPipeline(checkpointId, pointName) {
    showCenteredConfirmModal(
        "⚠️ Danger Operational Action Warning:",
        `Are you absolutely sure you want to delete the checkpoint "${pointName}"?\nThis action will immediately wipe the tracking barcode metrics from the database.`,
        () => {
            fetch(`/delete_checkpoint/${checkpointId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showCenteredAlertModal("Success!", `Checkpoint "${pointName}" has been completely deleted.`, "success");
                    const targetCardElement = document.getElementById(`checkpoint-card-node-${checkpointId}`);
                    if (targetCardElement) {
                        targetCardElement.style.transition = "all 0.3s ease";
                        targetCardElement.style.opacity = "0";
                        targetCardElement.style.transform = "scale(0.8)";
                        setTimeout(() => { targetCardElement.remove(); }, 300);
                    }
                    const livePlantSelector = document.getElementById('plant_select_db') || document.getElementById('plant_select');
                    if (livePlantSelector && livePlantSelector.value === data.plant_id) {
                        handleAdminPlantDropdownChange(livePlantSelector);
                    }
                } else {
                    showCenteredAlertModal("System Failure", data.message, "danger");
                }
            })
            .catch(error => {
                console.error("Critical failure during asset deletion trace:", error);
                showCenteredAlertModal("Network Error", "Network transaction failure occurred trying to drop matrix data arrays.", "danger");
            });
        }
    );
}

function showCenteredPromptModal(dropdownElement) {
    if (!document.getElementById('modal-vibrant-styles')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = "modal-vibrant-styles";
        styleSheet.innerText = `@keyframes popIn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }`;
        document.head.appendChild(styleSheet);
    }

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '9999', backdropFilter: 'blur(5px)'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#ffffff', padding: '25px', borderRadius: '16px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box',
        borderLeft: '6px solid #3b82f6', animation: 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
    });

    modal.innerHTML = `
        <h3 style="margin-top:0; color:#1e3a8a; font-size:20px; font-weight:700; border-bottom:2px solid #eff6ff; padding-bottom:12px; text-align:left;">New Target Checkpoint</h3>
        <p style="margin:14px 0 8px 0; font-size:14px; color:#475569; font-weight:600; text-align:left;">Enter the new Target Plant Checkpoint Location Name:</p>
        <input type="text" id="customCheckpointInput" autocomplete="off" placeholder="e.g. Storage Bay Alpha" style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px; margin-bottom:20px; box-sizing:border-box; outline:none; transition: all 0.2s;" onfocus="this.style.borderColor='#3b82f6';" onblur="this.style.borderColor='#cbd5e1';">
        <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button id="modalCancelBtn" style="padding:10px 18px; background-color:#f1f5f9; color:#64748b; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;">Cancel</button>
            <button id="modalSubmitBtn" style="padding:10px 20px; background-color:#3b82f6; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px; box-shadow: 0 4px 12px rgba(59,130,246,0.25);">Confirm Base</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const inputField = modal.querySelector('#customCheckpointInput');
    inputField.focus();

    function handleConfirm() {
        const textValue = inputField.value.trim();
        if (textValue === "") {
            showCenteredAlertModal("Validation Error", "Checkpoint location name cannot be left blank.", "danger");
            inputField.focus();
            return;
        }

        let duplicateFound = false;
        Array.from(dropdownElement.options).forEach(opt => {
            if (opt.value.toLowerCase() === textValue.toLowerCase()) {
                duplicateFound = true;
            }
        });

        if (duplicateFound) {
            cleanup();
            showCenteredAlertModal("⚠️ Already Exists", `The checkpoint target location "${textValue}" already exists or is locked in this configuration.`, "warning");
            dropdownElement.value = "";
            return;
        }

        const newOption = document.createElement('option');
        newOption.value = textValue;
        newOption.textContent = textValue;
        newOption.selected = true;
        dropdownElement.appendChild(newOption);

        cleanup();
        showCenteredAlertModal("Success", `New Custom Target "${textValue}" created successfully.`, "success");
    }

    function handleCancel() {
        dropdownElement.value = "";
        cleanup();
    }

    function cleanup() {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }

    modal.querySelector('#modalSubmitBtn').addEventListener('click', handleConfirm);
    modal.querySelector('#modalCancelBtn').addEventListener('click', handleCancel);

    inputField.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    });
}


function showCenteredAlertModal(title, textContent, alertType = "primary") {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '10000', backdropFilter: 'blur(5px)'
    });

    let borderThemeColor = "#3b82f6";
    let btnThemeColor = "#3b82f6";
    
    if (alertType === "warning") {
        borderThemeColor = "#f59e0b";
        btnThemeColor = "#f59e0b";
    } else if (alertType === "danger") {
        borderThemeColor = "#ef4444";
        btnThemeColor = "#ef4444";
    } else if (alertType === "success") {
        borderThemeColor = "#10b981";
        btnThemeColor = "#10b981";
    }

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#ffffff', padding: '25px', borderRadius: '16px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box', 
        textAlign: 'center', borderLeft: `6px solid ${borderThemeColor}`,
        animation: 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
    });

    modal.innerHTML = `
        <h3 style="margin-top:0; color:#1e293b; font-size:19px; font-weight:700; border-bottom:2px solid #f8fafc; padding-bottom:10px;">${title}</h3>
        <p style="margin:15px 0; font-size:14px; color:#475569; white-space: pre-line; line-height: 1.5; font-weight:500;">${textContent}</p>
        <button id="alertCloseBtn" style="padding:10px 24px; background-color:${btnThemeColor}; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">Dismiss</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeBtn = modal.querySelector('#alertCloseBtn');
    closeBtn.focus();
    
    closeBtn.addEventListener('click', () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
    });
}

function showCenteredConfirmModal(title, textContent, confirmCallback) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '10000', backdropFilter: 'blur(5px)'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#ffffff', padding: '25px', borderRadius: '16px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        fontFamily: "'Segoe UI', system-ui, sans-serif", boxSizing: 'border-box',
        borderLeft: '6px solid #ef4444'
    });

    modal.innerHTML = `
        <h3 style="margin-top:0; color:#b91c1c; font-size:19px; font-weight:700; border-bottom:2px solid #fef2f2; padding-bottom:10px; text-align:left;">${title}</h3>
        <p style="margin:15px 0; font-size:14px; color:#475569; white-space: pre-line; line-height: 1.5; text-align:left; font-weight:500;">${textContent}</p>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button id="confirmCancelBtn" style="padding:10px 18px; background-color:#f1f5f9; color:#64748b; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;">Abort Action</button>
            <button id="confirmSubmitBtn" style="padding:10px 20px; background-color:#ef4444; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px; box-shadow: 0 4px 12px rgba(239,68,68,0.25);">Execute Deletion</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('#confirmCancelBtn').addEventListener('click', () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
    });

    modal.querySelector('#confirmSubmitBtn').addEventListener('click', () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        confirmCallback();
    });
}

function switchRegistrationTab(event, targetPanelId) {
    const panels = document.querySelectorAll('.tab-content-panel');
    panels.forEach(p => p.classList.remove('active-tab-state'));
    
    const buttons = document.querySelectorAll('.tab-trigger-btn');
    buttons.forEach(b => b.classList.remove('active-tab-state'));
    
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) targetPanel.classList.add('active-tab-state');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active-tab-state');
    } else {
        buttons.forEach(b => {
            const clickAttr = b.getAttribute('onclick');
            if (clickAttr && clickAttr.includes(targetPanelId)) {
                b.classList.add('active-tab-state');
            }
        });
    }
}

const plantDropdown = document.getElementById('plant_node_dropdown');
const digitsInput = document.getElementById('card_digits_input');
const liveIdView = document.getElementById('live-id-view');

function updateLiveWorkerIdTextString() {
    if (!plantDropdown || !liveIdView) return;
    const selectedOption = plantDropdown.options[plantDropdown.selectedIndex];
    if (!selectedOption || selectedOption.disabled) {
        liveIdView.innerText = "_____";
        return;
    }
    const prefix = selectedOption.getAttribute('data-prefix') || "";
    const digits = digitsInput ? digitsInput.value.trim() : "";
    liveIdView.innerText = prefix + (digits ? digits : "_____");
}

if (plantDropdown && digitsInput) {
    plantDropdown.addEventListener('change', updateLiveWorkerIdTextString);
    digitsInput.addEventListener('input', updateLiveWorkerIdTextString);
}

function printSingleCard(pointName, plantId, base64ImageSrc) { runSharedPrintFrame(base64ImageSrc, pointName, plantId); }
function printQrAsset(base64ImageSrc, pointName, plantId) { runSharedPrintFrame(base64ImageSrc, pointName, plantId); }

function runSharedPrintFrame(base64Src, pointName, plantId) {
    if (!base64Src || base64Src === "") {
        showCenteredAlertModal("Print Error", "Cannot print: Barcode payload data missing.", "danger");
        return;
    }
    const printWindow = window.open('', '_blank', 'width=420,height=420');
    printWindow.document.write(`
        <html><head><title>Print Card - ${pointName}</title><style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .print-box { border: 2px dashed #000; padding: 20px; display: inline-block; border-radius: 8px; }
            h2 { margin: 0 0 5px 0; font-size: 18px; }
            p { margin: 0 0 15px 0; color: #555; font-size: 13px; font-weight: bold; }
            img { width: 180px; height: 180px; display: block; margin: 0 auto; }
        </style></head>
        <body onload="window.print(); window.close();">
            <div class="print-box"><h2>${pointName}</h2><p>Factory jurisdiction Reference: ${plantId}</p><img src="${base64Src}"></div>
        </body></html>
    `);
    printWindow.document.close();
}

// ... [Keep your modal and print functions exactly as they are above this] ...

function handleWorkerRegistrationSuccess(regNumber, userName) {
    showCenteredAlertModal(
        "Worker Registration Success", 
        `your registration successfully Registration no is ${regNumber}\nsuccessfully created user is ${userName}`, 
        "success"
    );
}

function handleAdminRegistrationSuccess(regNumber, adminName) {
    showCenteredAlertModal(
        "Admin Registration Success", 
        `your registration successfully Registration no is ${regNumber}\nsuccessfully created user is ${adminName}`, 
        "success"
    );
}

// Scans backend notification inputs and instantly wipes values to block popups on refresh
function scanFlaskContextMessages() {
    const errorContainer = document.getElementById('flask-backend-error-data');
    const successContainer = document.getElementById('flask-backend-success-data');
    
    if (errorContainer && errorContainer.value.trim() !== "") {
        const errorMsg = errorContainer.value;
        errorContainer.value = ""; // Clear data field immediately
        showCenteredAlertModal("Error", errorMsg, "danger");
    }
    
    if (successContainer && successContainer.value.trim() !== "") {
        const successMsg = successContainer.value;
        successContainer.value = ""; // Clear data field immediately
        showCenteredAlertModal("Success", successMsg, "success");
    }
}

// Single consolidated controller for the Live Worker Login ID generation view
function initLiveIdGenerationEngine() {
    const plantDropdown = document.getElementById('plant_node_dropdown');
    const digitsInput = document.getElementById('card_digits_input');
    const liveIdView = document.getElementById('live-id-view');

    function updateLiveWorkerIdTextString() {
        if (!plantDropdown || !liveIdView) return;
        const selectedOption = plantDropdown.options[plantDropdown.selectedIndex];
        if (!selectedOption || selectedOption.disabled || selectedOption.value === "") {
            liveIdView.innerText = "_____";
            return;
        }
        const prefix = selectedOption.getAttribute('data-prefix') || "";
        const digits = digitsInput ? digitsInput.value.trim() : "";
        liveIdView.innerText = prefix + (digits ? digits : "_____");
    }

    if (plantDropdown && digitsInput) {
        plantDropdown.addEventListener('change', updateLiveWorkerIdTextString);
        digitsInput.addEventListener('input', updateLiveWorkerIdTextString);
        updateLiveWorkerIdTextString(); // Run once initially to catch page state
    }
}

// Unified Single DOM initialization block sequence
document.addEventListener("DOMContentLoaded", () => {
    scanFlaskContextMessages();
    initLiveIdGenerationEngine();
});
