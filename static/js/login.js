/**
 * Live System Clock
 * Updates the 'live-timestamp' element every second with the local system time.
 */
function updateTimestamp() {
    const timestampElement = document.getElementById('live-timestamp');
    
    // Safety check to prevent errors if the element does not exist on the page
    if (timestampElement) {
        const now = new Date();
        timestampElement.innerText = "System Time: " + now.toLocaleString();
    }
}

// Initialize the clock interval to update every 1000ms (1 second)
setInterval(updateTimestamp, 1000);

// Run immediately once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', updateTimestamp);
