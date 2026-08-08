document.getElementById('plant_select').addEventListener('change', function() {
    const pId = this.value;
    const hiddenId = document.getElementById('hidden_plant_id');
    const hiddenName = document.getElementById('hidden_plant_name');
    const ptSelect = document.getElementById('point_select');
    
    const activeOpt = this.options[this.selectedIndex];
    hiddenId.value = pId;
    hiddenName.value = activeOpt.getAttribute('data-name') || '';

    ptSelect.innerHTML = '<option value="">-- Synchronizing Checkpoints... --</option>';
    ptSelect.disabled = true;

    if (!pId) {
        ptSelect.innerHTML = '<option value="">-- Select Facility First --</option>';
        return;
    }

    // Fetch existing checkpoints from your database
    fetch(`/get_checkpoints/${encodeURIComponent(pId)}`)
        .then(res => res.json())
        .then(pointsArray => {
            ptSelect.innerHTML = '<option value="">-- Choose Checkpoint Location Name --</option>';
            
            // 1. ADD NEW CREATION TRIGGER AT THE TOP OF THE LIST
            const newCustomOpt = document.createElement('option');
            newCustomOpt.value = "CREATE_NEW";
            newCustomOpt.style.color = "#0d6efd";
            newCustomOpt.style.fontWeight = "bold";
            newCustomOpt.textContent = "[+] Create New Custom Checkpoint...";
            ptSelect.appendChild(newCustomOpt);

            // 2. Populate standard database checkpoints underneath it
            pointsArray.forEach(item => {
                const optNode = document.createElement('option');
                optNode.value = item.point_name;
                
                if (item.is_created === 1) {
                    optNode.textContent = item.point_name + " (⚠️ Already Created)";
                    optNode.disabled = true; 
                    optNode.style.color = "#adb5bd";
                } else {
                    optNode.textContent = item.point_name;
                }
                ptSelect.appendChild(optNode);
            });

            ptSelect.disabled = false;
        });
});

// Intercept when user clicks "[+] Create New Custom Checkpoint..."
document.getElementById('point_select').addEventListener('change', function() {
    if (this.value === "CREATE_NEW") {
        showCenteredPromptModal(this);
    }
});

// Helper function to build, style, and center a pop-up window on screen
function showCenteredPromptModal(dropdownElement) {
    // 1. Create a darkened overlay container background
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '9999', backdropFilter: 'blur(2px)'
    });

    // 2. Create the centered window box card
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px',
        width: '100%', maxWidth: '420px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        fontFamily: "'Segoe UI', sans-serif", boxSizing: 'border-box'
    });

    // 3. Populate modal internal markup text inputs & elements
    modal.innerHTML = `
        <h3 style="margin-top:0; color:#212529; font-size:18px; border-bottom:1px solid #dee2e6; padding-bottom:10px;">New Checkpoint Name</h3>
        <p style="margin:10px 0; font-size:14px; color:#495057;">Enter the new Target Plant Checkpoint Location Name:</p>
        <input type="text" id="customCheckpointInput" autocomplete="off" style="width:100%; padding:10px; border:1px solid #ced4da; border-radius:6px; font-size:15px; margin-bottom:15px; box-sizing:border-box;">
        <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="modalCancelBtn" style="padding:8px 16px; background-color:#6c757d; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">Cancel</button>
            <button id="modalSubmitBtn" style="padding:8px 16px; background-color:#0d6efd; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">Confirm</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const inputField = modal.querySelector('#customCheckpointInput');
    inputField.focus(); // Focus cursor automatically onto input box instantly

    // Handle Confirm action logic
    function handleConfirm() {
        const textValue = inputField.value.trim();
        if (textValue !== "") {
            // Check for duplicates
            let isDuplicate = false;
            for (let i = 0; i < dropdownElement.options.length; i++) {
                if (dropdownElement.options[i].value.toLowerCase() === textValue.toLowerCase()) {
                    isDuplicate = true;
                    break;
                }
            }

            if (isDuplicate) {
                alert(`The checkpoint name "${textValue}" already exists.`);
                dropdownElement.value = "";
                cleanup();
                return;
            }

            // Create a brand new dynamic option block
            const customOption = document.createElement('option');
            customOption.value = textValue;
            customOption.textContent = textValue + " (New Custom Target)";
            
            // Inserts the new option right below the "Create New" selection option (index position 2)
            dropdownElement.insertBefore(customOption, dropdownElement.options[2]);
            dropdownElement.value = textValue; // Set active focus selection name
            cleanup();
        } else {
            alert("Location name cannot be empty.");
        }
    }

    // Handle Cancel action logic
    function handleCancel() {
        dropdownElement.value = ""; // Clear active choice back to empty placeholder
        cleanup();
    }

    function cleanup() {
        document.body.removeChild(overlay);
    }

    // Attach Event Listeners
    modal.querySelector('#modalSubmitBtn').addEventListener('click', handleConfirm);
    modal.querySelector('#modalCancelBtn').addEventListener('click', handleCancel);

    // Support "Enter" key submission configuration
    inputField.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    });
}
