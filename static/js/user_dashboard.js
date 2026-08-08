/**
 * 🏭 Factory Dashboard Camera, Scanner & Report Submission Master Pipeline
 * PART 1 OF 3: Global Configurations, Clock, and Frame Capture Utilities
 */

// 🌐 Global Variables Configuration (Staged safely within master context window)
let capturedData = window.capturedData || { qr_detail: null, live_photo: null, point_photo: null, area_video: null, remark: "" };
let mediaRecorder = window.mediaRecorder || null;
let recordedChunks = window.recordedChunks || [];
let cameraMediaStreamInstance = window.cameraMediaStreamInstance || null;
let backgroundScannerIntervalInstance = window.backgroundScannerIntervalInstance || null;

// Element References scoped globally for utility function access
let videoElement = null;
let toggleCameraTriggerButton = null;

// 🕒 AUTOMATED REAL-TIME METRIC COUNTER FOR FROZEN FOOTER CLOCK
function runLiveFrozenFooterClock() {
    const footerClockDisplayNode = document.getElementById('frozen-footer-terminal-clock');
    if (!footerClockDisplayNode) return;
    const timeNow = new Date();
    const currentDay = timeNow.getDate();
    const currentMonth = timeNow.getMonth() + 1;
    const currentYear = timeNow.getFullYear();
    const combinedDateString = `${currentDay}/${currentMonth}/${currentYear}`;
    const combinedTimeString = timeNow.toLocaleTimeString('en-US', { hour12: true }).toLowerCase();
    footerClockDisplayNode.innerText = `${combinedDateString}, ${combinedTimeString}`;
}

// 📷 Extract Current Canvas Frame to Data URL string representation
function getFrameData() {
    if (!videoElement || !videoElement.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
}
/**
 * 🏭 Factory Dashboard Camera, Scanner & Report Submission Master Pipeline
 * PART 2 OF 3: Background Scanner Engine and Popup Notifications
 */

// 🔍 Browser-native QR decoder.
// Vercel functions do not need OpenCV/ZBar: the camera frame is decoded locally
// in a Chromium-based browser and only the QR text is sent to Flask on submit.
let qrDetector = null;
let qrScannerWarningShown = false;

async function initQrDetector() {
    if (!('BarcodeDetector' in window)) {
        if (!qrScannerWarningShown) {
            qrScannerWarningShown = true;
            console.warn("BarcodeDetector is not supported by this browser. Use a recent Chrome/Edge browser on HTTPS.");
        }
        return false;
    }
    try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (!formats.includes('qr_code')) {
            console.warn("This browser does not expose QR-code detection.");
            return false;
        }
        qrDetector = new BarcodeDetector({ formats: ['qr_code'] });
        return true;
    } catch (error) {
        console.error("QR detector initialization failed:", error);
        return false;
    }
}

async function sendFrameToServer() {
    if (capturedData.qr_detail || !videoElement || !videoElement.videoWidth) return;

    if (!qrDetector) {
        const ready = await initQrDetector();
        if (!ready) return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const detectedCodes = await qrDetector.detect(canvas);
        if (!detectedCodes.length || !detectedCodes[0].rawValue) return;

        const incomingScannedCode = String(detectedCodes[0].rawValue).trim();

        // 📊 READ WORKER ASSIGNED CHECKLIST CONFIGURATIONS FROM THE TRACKER
        const assignedCheckpointsOnPage = Array.from(
            document.querySelectorAll('.worker-stats-tracker-panel span[style*="font-size: 13px"]')
        ).map(node =>
            node.textContent.replace('Cleared', '').replace('Pending', '').trim().toLowerCase()
        );

        let targetedCheckpointCleanName = incomingScannedCode.toLowerCase();
        if (incomingScannedCode.includes("CHECKPOINT:")) {
            try {
                targetedCheckpointCleanName =
                    incomingScannedCode.split("CHECKPOINT:")[1].split("|")[0].trim().toLowerCase();
            } catch (e) {}
        }

        const isAssignedToThisUser = assignedCheckpointsOnPage.some(assignedItem =>
            assignedItem.includes(targetedCheckpointCleanName) ||
            targetedCheckpointCleanName.includes(assignedItem)
        );

        if (!isAssignedToThisUser) {
            displayColorfulPopupNotification(
                "⚠️ This Checkpoint is not assigned to you!",
                "#c2410c", "#fff7ed", "#f97316"
            );
            return;
        }

        // Verification Rule B: Duplicate Checkpoint Protection
        const clearedItemsOnPageArray = Array.from(
            document.querySelectorAll('.worker-stats-tracker-panel div[style*="border: 1px solid #d1fae5"]')
        ).map(node =>
            node.textContent.replace('✓', '').replace('Cleared', '').trim().toLowerCase()
        );

        const isAlreadyClearedToday = clearedItemsOnPageArray.some(clearedItem =>
            clearedItem.includes(targetedCheckpointCleanName) ||
            targetedCheckpointCleanName.includes(clearedItem)
        );

        if (isAlreadyClearedToday) {
            displayColorfulPopupNotification(
                "⚠️ already scanned have done",
                "#c2410c", "#fff7ed", "#f97316"
            );
            return;
        }

        capturedData.qr_detail = incomingScannedCode;
        const outputField = document.getElementById('qr-result');
        if (outputField) {
            outputField.innerText = incomingScannedCode;
            outputField.style.background = "#d1fae5";
            outputField.style.color = "#065f46";
            outputField.style.fontWeight = "800";
        }
    } catch (error) {
        console.debug("QR frame detection skipped:", error);
    }
}

// 🟢 PREMIUM HIGH-CONTRAST COLORFUL POPUP MODAL NOTIFICATION WIDGET
function displayColorfulPopupNotification(messageText, textColor, bgColor, borderColor, shouldReload = false) {
    let alertNode = document.createElement('div');
    alertNode.style.position = 'fixed'; 
    alertNode.style.top = '50%'; 
    alertNode.style.left = '50%'; 
    alertNode.style.transform = 'translate(-50%, -50%)';
    alertNode.style.padding = '24px 40px'; 
    alertNode.style.borderRadius = '12px'; 
    alertNode.style.fontWeight = '800'; 
    alertNode.style.fontSize = '16px';
    alertNode.style.zIndex = '100005'; 
    alertNode.style.boxShadow = '0 25px 50px -12px rgba(15, 23, 42, 0.4)'; 
    alertNode.style.textAlign = 'center'; 
    alertNode.style.fontFamily = 'sans-serif';
    alertNode.style.color = textColor; 
    alertNode.style.backgroundColor = bgColor; 
    alertNode.style.border = '3px solid ' + borderColor; 
    alertNode.innerText = messageText;
    
    document.body.appendChild(alertNode);
    setTimeout(() => { 
        alertNode.remove(); 
        if (shouldReload) window.location.reload();
    }, 2000);
}
/**
 * 🏭 Factory Dashboard Camera, Scanner & Report Submission Master Pipeline
 * PART 3 OF 3: Initialization, Form Validation, Media Events, and Camera Controls
 */

// Master DOM Content Loader Trigger Pipeline
document.addEventListener('DOMContentLoaded', () => {
    // Resolve HTML UI Element DOM Node Bindings
    videoElement = document.getElementById('webcam');
    toggleCameraTriggerButton = document.getElementById('start-camera-stream-btn');

    // Run Clock Loop Instantly
    runLiveFrozenFooterClock();
    setInterval(runLiveFrozenFooterClock, 1000);

    // Dynamic Historical Checkpoint Date Input Handling (Points to current day / Hides tomorrow)
    const filterDateInput = document.getElementById('filterDate');
    if (filterDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); 
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedToday = `${yyyy}-${mm}-${dd}`;
        
        filterDateInput.max = formattedToday; // Lock UI selection at current calendar date max
        if (!filterDateInput.value) {
            filterDateInput.value = formattedToday;
        }
    }

    // 📸 Snap Live Verification Photo Action Handler Binding
    const snapLiveBtn = document.getElementById('snap-live');
    if (snapLiveBtn) {
        snapLiveBtn.addEventListener('click', () => {
            const data = getFrameData();
            if (data) {
                capturedData.live_photo = data;
                const visualImgNode = document.getElementById('preview-photo-node');
                if (visualImgNode) { visualImgNode.src = data; visualImgNode.style.display = 'block'; }
                
                const statusPhoto = document.getElementById('status-photo');
                if (statusPhoto) {
                    statusPhoto.innerText = "Captured Successfully";
                    statusPhoto.className = "badge true";
                }
            } else {
                displayColorfulPopupNotification("打 PACK FAULT: Please activate the Camera Scanner Terminal first!", "#991b1b", "#fee2e2", "#ef4444");
            }
        });
    }

    // 🏗️ Snap Checkpoint Location Photo Action Handler Binding
    const snapPointBtn = document.getElementById('snap-point');
    if (snapPointBtn) {
        snapPointBtn.addEventListener('click', () => {
            const data = getFrameData();
            if (data) {
                capturedData.point_photo = data;
                const visualImgNode = document.getElementById('preview-point-node');
                if (visualImgNode) { visualImgNode.src = data; visualImgNode.style.display = 'block'; }
                
                const statusPoint = document.getElementById('status-point');
                if (statusPoint) {
                    statusPoint.innerText = "Captured Successfully";
                    statusPoint.className = "badge true";
                }
            } else {
                displayColorfulPopupNotification("打 PACK FAULT: Please activate the Camera Scanner Terminal first!", "#991b1b", "#fee2e2", "#ef4444");
            }
        });
    }

    // 📹 Record 5-Second Plant Area Verification Short Video Stream Binding (OPTIONAL ASSET)
    const recordVideoBtn = document.getElementById('record-video');
    if (recordVideoBtn) {
        recordVideoBtn.addEventListener('click', () => {
            if (!mediaRecorder) {
                displayColorfulPopupNotification("🚨 RECORDING ERROR: Please activate the Camera Scanner Terminal first!", "#991b1b", "#fee2e2", "#ef4444");
                return;
            }
            if (mediaRecorder.state === "inactive") {
                recordedChunks = [];
                mediaRecorder.start();
                recordVideoBtn.innerText = "Recording...";
                
                setTimeout(() => {
                    if (mediaRecorder && mediaRecorder.state === "recording") {
                        mediaRecorder.stop();
                    }
                    recordVideoBtn.innerText = "Record Video (5s)";
                }, 5000);
            }
        });
    }

    // 📊 FACTORY REPORT SUBMISSION NET TRANSMISSION PIPELINE
    const submitAllBtn = document.getElementById('submit-all');
    if (submitAllBtn) {
        submitAllBtn.addEventListener('click', () => {
            const remarkInput = document.getElementById('remark');
            capturedData.remark = remarkInput ? remarkInput.value : "";
            if (!capturedData.qr_detail) {
                displayColorfulPopupNotification(
                    "⚠️ Please flash a valid QR Code target directly into the camera preview box first.",
                    "#c2410c", "#fff7ed", "#f97316"
                );
                return;
            }

            fetch('/submit_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(capturedData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    displayColorfulPopupNotification(
                        "✨Data Synced Successfully!", 
                        "#065f46", "#d1fae5", "#10b981", true
                    );
                } else {
                    displayColorfulPopupNotification(
                        "🚨 TRANSACTION FAULT: " + data.message, 
                        "#991b1b", "#fee2e2", "#ef4444"
                    );
                }
            })
            .catch(error => {
                console.error("Network Transmission write fault error trace:", error);
                displayColorfulPopupNotification(
                    "🚨 SERVER OFFLINE: Unable to establish database handshake routines.", 
                    "#7c2d12", "#ffedd5", "#ea580c"
                );
            });
        });
    }

    // 📷 CAMERA TERMINAL LIFECYCLE EVENT INITIALIZATION AND TOGGLEHANDLER
    if (toggleCameraTriggerButton && videoElement) {
        toggleCameraTriggerButton.addEventListener('click', async () => {
            if (cameraMediaStreamInstance) {
                const streamTracks = cameraMediaStreamInstance.getTracks();
                streamTracks.forEach(track => track.stop());
                videoElement.srcObject = null;
                cameraMediaStreamInstance = null;
                
                if (backgroundScannerIntervalInstance) {
                    clearInterval(backgroundScannerIntervalInstance);
                    backgroundScannerIntervalInstance = null;
                }
                mediaRecorder = null;
                
                toggleCameraTriggerButton.innerText = "📷 Start Camera Scanner Terminal";
                toggleCameraTriggerButton.style.background = "#10b981";
                
                displayColorfulPopupNotification(
                    "🛑 Click camera stop", 
                    "#1e3a8a", "#eff6ff", "#3b82f6"
                );
                return;
            }
            try {
                const mediaConstraints = { 
                    video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }, 
                    audio: false 
                };
                cameraMediaStreamInstance = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                videoElement.srcObject = cameraMediaStreamInstance;
                
                mediaRecorder = new MediaRecorder(cameraMediaStreamInstance, { mimeType: 'video/webm' });
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        capturedData.area_video = reader.result;
                        const visualVidNode = document.getElementById('preview-video-node');
                        if (visualVidNode) { visualVidNode.src = reader.result; visualVidNode.style.display = 'block'; }
                        
                        const statusVideo = document.getElementById('status-video');
                        if (statusVideo) {
                            statusVideo.innerText = "Captured Successfully";
                            statusVideo.className = "badge true";
                        }
                    };
                };
                
                backgroundScannerIntervalInstance = setInterval(sendFrameToServer, 400);
                toggleCameraTriggerButton.innerText = "🛑 Stop Camera Scanner Terminal";
                toggleCameraTriggerButton.style.background = "#ef4444";
                
                displayColorfulPopupNotification(
                    "✨ Camera Turn on", 
                    "#065f46", "#d1fae5", "#10b981"
                );
            } catch (error) {
                console.error("Camera Access Core Error Exception Logs:", error);
                displayColorfulPopupNotification(
                    "🚨 SYSTEM REJECTION: Unable to open camera preview terminal. Verify hardware connections.",
                    "#991b1b", "#fee2e2", "#ef4444"
                );
            }
        });
    }
});
// Dynamic Date Handling Script 
window.addEventListener('DOMContentLoaded', () => {
                const dateInput = document.getElementById('filterDate');

                // Generate current local date formatted as YYYY-MM-DD
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const formattedToday = `${yyyy}-${mm}-${dd}`;

                // 1. Blocks tomorrow and all future dates
                dateInput.max = formattedToday;

                // 2. Fallback: If Jinja template value is empty, set default to today
                if (!dateInput.value) {
                    dateInput.value = formattedToday;
                }
            });