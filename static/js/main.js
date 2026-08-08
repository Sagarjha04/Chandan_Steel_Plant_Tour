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
    alert("Camera Access Failure: " + err.name);
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
            outputField.style.background = "#d4edda";
            outputField.style.color = "#155724";
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
    recordedChunks = [];
    mediaRecorder.start();
    document.getElementById('record-video').innerText = "Recording...";
    setTimeout(() => {
        mediaRecorder.stop();
        document.getElementById('record-video').innerText = "Record Video (3s)";
    }, 3000);
});

document.getElementById('submit-all').addEventListener('click', () => {
    capturedData.remark = document.getElementById('remark').value;
    
    if (!capturedData.qr_detail) {
        alert("Please flash a valid QR Code target directly into the camera preview box first.");
        return;
    }

    fetch('/submit_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capturedData)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.status === 'success') window.location.reload();
    });
});
