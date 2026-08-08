function triggerPopUpModal(title, text, profileType = 'success') {
            const overlay = document.getElementById('global-system-modal-carrier');
            const box = document.getElementById('modal-theme-box');
            document.getElementById('modal-graphic-symbol').innerText = (profileType === 'success') ? '✅' : '❌';
            document.getElementById('modal-header-title').innerText = title;
            document.getElementById('modal-body-text').innerText = text;
            box.className = `custom-modal-box profile-${profileType}`;
            overlay.classList.add('modal-active-state');
        }
        function dismissCentralOverlayModal() { document.getElementById('global-system-modal-carrier').classList.remove('modal-active-state'); }
        
        document.addEventListener("DOMContentLoaded", () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('reset_success') === '1') {
                triggerPopUpModal("✅ Update Confirmed", "Administrative master password updated. Log in again.", "success");
            }  
            if (urlParams.get('auth_error') === 'invalid_credentials') {
                triggerPopUpModal(
                    "❌ Authentication Failed", 
                    "Your ID or Password is incorrect. Access Denied.", 
                    "error"
                );
            }
        });

        // 🕒 AUTOMATED REAL-TIME METRIC COUNTER FOR FROZEN FOOTER CLOCK
        function runLiveFrozenFooterClock() {
            const clockEl = document.getElementById('frozen-footer-terminal-clock');
            if (!clockEl) return;
            const timeNow = new Date();
            const currentDay = timeNow.getDate();
            const currentMonth = timeNow.getMonth() + 1;
            const currentYear = timeNow.getFullYear();
            
            const combinedDateString = `${currentDay}/${currentMonth}/${currentYear}`;
            const combinedTimeString = timeNow.toLocaleTimeString('en-US', { hour12: true }).toLowerCase();
            clockEl.innerText = `${combinedDateString}, ${combinedTimeString}`;
        }
        runLiveFrozenFooterClock();
        setInterval(runLiveFrozenFooterClock, 1000);