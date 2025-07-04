// Content script that runs on all pages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getScrollPosition') {
        const scrollY = window.scrollY;
        const maxScroll = Math.max(
            document.body.scrollHeight - window.innerHeight,
            document.documentElement.scrollHeight - window.innerHeight,
            0
        );

        sendResponse({
            scrollY: scrollY,
            maxScroll: maxScroll,
            windowHeight: window.innerHeight,
            documentHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        });
    }

    if (request.action === 'scrollToPosition') {
        window.scrollTo({
            top: request.scrollY,
            behavior: 'smooth'
        });

        // Show a visual indicator
        showScrollIndicator(request.scrollY);

        sendResponse({success: true});
    }
});

function showScrollIndicator(targetPosition) {
    // Create a temporary indicator to show where we scrolled to
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 14px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    indicator.textContent = `Restored to position: ${targetPosition}px`;

    document.body.appendChild(indicator);

    setTimeout(() => {
        if (document.body.contains(indicator)) {
            document.body.removeChild(indicator);
        }
    }, 3000);
}

// Auto-save progress periodically (optional feature)
let autoSaveInterval;
let lastScrollY = 0;

function enableAutoSave() {
    // Save progress every 30 seconds if user has scrolled
    autoSaveInterval = setInterval(() => {
        const currentScrollY = window.scrollY;
        if (Math.abs(currentScrollY - lastScrollY) > 100) { // Only save if scrolled more than 100px
            lastScrollY = currentScrollY;

            const maxScroll = Math.max(
                document.body.scrollHeight - window.innerHeight,
                document.documentElement.scrollHeight - window.innerHeight,
                0
            );

            const bookmark = {
                url: window.location.href,
                title: document.title,
                scrollY: currentScrollY,
                maxScroll: maxScroll,
                timestamp: new Date().toISOString(),
                progress: Math.round((currentScrollY / (maxScroll || 1)) * 100),
                autoSaved: true
            };

            // Save to storage with auto-save prefix
            const key = `autosave_${window.location.href}`;
            chrome.storage.local.set({[key]: bookmark});
        }
    }, 30000); // 30 seconds
}

// Uncomment the line below to enable auto-save feature
// enableAutoSave();