let capturedData = { qr_detail: null, live_photo: null, point_photo: null, area_video: null };
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.getElementById('webcam');

// 1. Startup Standard Device Camera
navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: "environment" }, 
    audio: false 
})
.then(stream => {
    videoElement.srcObject = stream;
    
    // Setup Media Recording Engine profiles
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            capturedData.area_video = reader.result;
            document.getElementById('status-video').innerText = "Captured Successfully";
            document.getElementById('status-video').className = "badge true";
        };
    };

    // Begin looping background frames to Python server for QR processing
    setInterval(sendFrameToServer, 400);
})
.catch(err => {
    // 🎨 REMOVED PLAIN ALERT: Replaced with high-visibility dashboard popup controller execution
    if (typeof showStatusPopup === 'function') {
        showStatusPopup('error');
    } else {
        console.error("Camera Access Failure: " + err.name);
    }
});

// 2. Extract Current Frame to Data URL string representation
function getFrameData() {
    if (!videoElement.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
}

// 3. Post Image Frame to Python Server Background Decoder Router
function sendFrameToServer() {
    if (capturedData.qr_detail) return; // Stop scanning once a QR code has already been caught
    
    const frameData = getFrameData();
    if (!frameData) return;

    fetch('/scan_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameData })
    })
    .then(res => res.json())
    .then(data => {
        if (data.qr_text) {
            capturedData.qr_detail = data.qr_text;
            const outputField = document.getElementById('qr-result');
            outputField.innerText = data.qr_text;
            outputField.style.background = "#d1fae5";
            outputField.style.color = "#065f46";
            outputField.style.fontWeight = "800";
        }
    })
    .catch(err => console.error("Scanner tracking frame frame sync fault:", err));
}
// 4. Input Button Bindings Event handlers
document.getElementById('snap-live').addEventListener('click', () => {
    const data = getFrameData();
    if (data) {
        capturedData.live_photo = data;
        document.getElementById('status-photo').innerText = "Captured Successfully";
        document.getElementById('status-photo').className = "badge true";
    }
});

document.getElementById('snap-point').addEventListener('click', () => {
    const data = getFrameData();
    if (data) {
        capturedData.point_photo = data;
        document.getElementById('status-point').innerText = "Captured Successfully";
        document.getElementById('status-point').className = "badge true";
    }
});

document.getElementById('record-video').addEventListener('click', () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        recordedChunks = [];
        if (mediaRecorder) mediaRecorder.start();
        document.getElementById('record-video').innerText = "Recording...";
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                mediaRecorder.stop();
            }
            document.getElementById('record-video').innerText = "Record Video (3s)";
        }, 3000);
    }
});

// 🟢 INTEGRATED SUCCESS & ERROR POPUP MODAL ENGINE
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

// 📊 FACTORY REPORT SUBMISSION PIPELINE (VIDEO IS NOT MANDATORY)
document.getElementById('submit-all').addEventListener('click', () => {
    capturedData.remark = document.getElementById('remark').value;
    
    // Ensure QR detail is captured first
    if (!capturedData.qr_detail) {
        displayColorfulPopupNotification(
            "⚠️ Please flash a valid QR Code target directly into the camera preview box first.",
            "#c2410c",
            "#fff7ed",
            "#f97316"
        );
        return;
    }

    // Video is explicitly NOT mandatory; if missing, submission proceeds cleanly
    fetch('/submit_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capturedData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            displayColorfulPopupNotification(
                "✨ FACTORY REPORT DATA SECURELY COMMITTED INTO PRODUCTION SERVERS!", 
                "#065f46", 
                "#d1fae5", 
                "#10b981",
                true
            );
        } else {
            displayColorfulPopupNotification(
                "🚨 TRANSACTION FAULT: " + data.message, 
                "#991b1b", 
                "#fee2e2", 
                "#ef4444"
            );
        }
    })
    .catch(error => {
        console.error("Network Transmission write fault error trace:", error);
        displayColorfulPopupNotification(
            "🚨 SERVER OFFLINE: Unable to establish database handshake routines.", 
            "#7c2d12", 
            "#ffedd5", 
            "#ea580c"
        );
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const webcamVideoElement = document.getElementById('webcam');
    const toggleCameraTriggerButton = document.getElementById('start-camera-stream-btn');
    const footerClockDisplayNode = document.getElementById('frozen-footer-terminal-clock');
    
    // Popup UI DOM HTML bindings
    const statusPopupOverlay = document.getElementById('custom-camera-status-popup');
    const popupModalCard = document.getElementById('popup-modal-card');
    const popupStatusIcon = document.getElementById('popup-status-icon');
    const popupStatusTitle = document.getElementById('popup-status-title');
    const popupStatusMessage = document.getElementById('popup-status-message');
    const closePopupTrigger = document.getElementById('close-camera-popup-btn');
    
    let cameraMediaStreamInstance = null;

    // 🕒 AUTOMATED REAL-TIME METRIC COUNTER FOR FROZEN FOOTER CLOCK
    function runLiveFrozenFooterClock() {
        if (!footerClockDisplayNode) return;
        const timeNow = new Date();
        const currentDay = timeNow.getDate();
        const currentMonth = timeNow.getMonth() + 1;
        const currentYear = timeNow.getFullYear();
        
        const combinedDateString = `${currentDay}/${currentMonth}/${currentYear}`;
        const combinedTimeString = timeNow.toLocaleTimeString('en-US', { hour12: true }).toLowerCase();
        footerClockDisplayNode.innerText = `${combinedDateString}, ${combinedTimeString}`;
    }
    runLiveFrozenFooterClock();
    setInterval(runLiveFrozenFooterClock, 1000);

    // 🎨 CORE HELPER INTERFACE TO DISPLAY STYLED ANIMATED POPUPS
    function showStatusPopup(actionType) {
        if (!statusPopupOverlay || !popupModalCard) return;
        
        if (actionType === 'start') {
            popupModalCard.style.borderTopColor = "#10b981";
            popupStatusIcon.innerText = "🟢 📷";
            popupStatusTitle.innerText = "Scanner Terminal Active";
            popupStatusTitle.style.color = "#065f46";
            popupStatusMessage.innerText = "The Active Camera Stream has successfully initialized. Ready to process point barcodes and submit factory report validations.";
        } else if (actionType === 'stop') {
            popupModalCard.style.borderTopColor = "#ef4444";
            popupStatusIcon.innerText = "🔴 🛑";
            popupStatusTitle.innerText = "Scanner Terminal Offline";
            popupStatusTitle.style.color = "#991b1b";
            popupStatusMessage.innerText = "The scanner terminal camera stream has been stopped cleanly. Hardware captures disabled until next cycle.";
        } else if (actionType === 'error') {
            popupModalCard.style.borderTopColor = "#f97316";
            popupStatusIcon.innerText = "⚠️ 🚨";
            popupStatusTitle.innerText = "Media Rejection Error";
            popupStatusTitle.style.color = "#c2410c";
            popupStatusMessage.innerText = "Unable to open camera terminal. Please check your system hardware connection configurations and browser permissions.";
        }
        
        statusPopupOverlay.style.display = "flex";
        setTimeout(() => {
            popupModalCard.style.transform = "scale(1)";
        }, 10);
    }

    if (closePopupTrigger && statusPopupOverlay) {
        closePopupTrigger.addEventListener('click', () => {
            popupModalCard.style.transform = "scale(0.9)";
            statusPopupOverlay.style.display = "none";
        });
    }

    // 📷 WEBOCULAR MEDIA STREAM TOGGLE ACTION MANAGEMENT
    if (toggleCameraTriggerButton && webcamVideoElement) {
        toggleCameraTriggerButton.addEventListener('click', async () => {
            if (cameraMediaStreamInstance) {
                const streamTracks = cameraMediaStreamInstance.getTracks();
                streamTracks.forEach(track => track.stop());
                webcamVideoElement.srcObject = null;
                cameraMediaStreamInstance = null;
                toggleCameraTriggerButton.innerText = "📷 Start Camera Scanner Terminal";
                toggleCameraTriggerButton.style.background = "#10b981";
                
                showStatusPopup('stop');
                return;
            }

            try {
                const mediaConstraints = { 
                    video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }, 
                    audio: false 
                };
                cameraMediaStreamInstance = await navigator.mediaDevices.getUserMedia(mediaConstraints);
                webcamVideoElement.srcObject = cameraMediaStreamInstance;
                toggleCameraTriggerButton.innerText = "🛑 Stop Camera Scanner Terminal";
                toggleCameraTriggerButton.style.background = "#ef4444";
                
                showStatusPopup('start');
                
                if (typeof sendFrameToServer === 'function') {
                    // Coordinates frame scanner processing loop sequence
                    console.log("Scanner loop sequence ready to process target data frames.");
                }
            } catch (error) {
                console.error("Camera Gateway Core Error Logs:", error);
                showStatusPopup('error');
            }
        });
    }
});
