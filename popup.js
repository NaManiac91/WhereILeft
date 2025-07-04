document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveProgress');
    const restoreBtn = document.getElementById('restoreProgress');
    const clearAllBtn = document.getElementById('clearAll');
    const progressText = document.getElementById('progressText');
    const bookmarksList = document.getElementById('bookmarksList');

    // Get current tab info and update UI
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const currentTab = tabs[0];

        // Get current scroll position
        chrome.tabs.sendMessage(currentTab.id, {action: 'getScrollPosition'}, response => {
            if (response) {
                const progress = Math.round((response.scrollY / (response.maxScroll || 1)) * 100);
                progressText.innerHTML = `
                    <strong>Current Page:</strong> ${currentTab.title}<br>
                    <strong>Scroll Position:</strong> ${response.scrollY}px<br>
                    <strong>Progress:</strong> ${progress}%
                `;
            }
        });
    });

    // Load and display saved bookmarks
    loadBookmarks();

    // Save progress
    saveBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            const currentTab = tabs[0];

            chrome.tabs.sendMessage(currentTab.id, {action: 'getScrollPosition'}, response => {
                if (response) {
                    const bookmark = {
                        url: currentTab.url,
                        title: currentTab.title,
                        scrollY: response.scrollY,
                        maxScroll: response.maxScroll,
                        timestamp: new Date().toISOString(),
                        progress: Math.round((response.scrollY / (response.maxScroll || 1)) * 100)
                    };

                    // Save to storage
                    const key = `bookmark_${currentTab.url}`;
                    chrome.storage.local.set({[key]: bookmark}, () => {
                        loadBookmarks();
                        showNotification('Progress saved!');
                    });
                }
            });
        });
    });

    // Restore progress
    restoreBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            const currentTab = tabs[0];
            const key = `bookmark_${currentTab.url}`;

            chrome.storage.local.get([key], result => {
                if (result[key]) {
                    chrome.tabs.sendMessage(currentTab.id, {
                        action: 'scrollToPosition',
                        scrollY: result[key].scrollY
                    });
                    showNotification('Progress restored!');
                } else {
                    showNotification('No saved progress for this page');
                }
            });
        });
    });

    // Clear all bookmarks
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all bookmarks?')) {
            chrome.storage.local.clear(() => {
                loadBookmarks();
                showNotification('All bookmarks cleared!');
            });
        }
    });

    function loadBookmarks() {
        chrome.storage.local.get(null, items => {
            const bookmarks = Object.values(items).filter(item => item.url);
            bookmarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (bookmarks.length === 0) {
                bookmarksList.innerHTML = '<div class="no-bookmarks">No saved bookmarks</div>';
                return;
            }

            bookmarksList.innerHTML = bookmarks.map(bookmark => `
                <div class="bookmark-item">
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-url">${bookmark.url}</div>
                    <div class="bookmark-progress">Progress: ${bookmark.progress}% • ${new Date(bookmark.timestamp).toLocaleString()}</div>
                    <div style="margin-top: 8px;">
                        <button id="restoreBtn" class="button restore-btn" data-url="${bookmark.url}" data-scroll="${bookmark.scrollY}" style="font-size: 10px; padding: 4px 8px;">Restore</button>
                        <button id="deleteBtn" class="button delete-btn" data-url="${bookmark.url}" style="font-size: 10px; padding: 4px 8px;">Delete</button>
                    </div>
                </div>
            `).join('');

            document.getElementById('restoreBtn').addEventListener('click', element => {
                const url = element.currentTarget.getAttribute('data-url');
                const scrollY = parseInt(element.currentTarget.getAttribute('data-scroll'), 10);

                restoreBookmark(url, scrollY);
            });

            document.getElementById('deleteBtn').addEventListener('click', element => {
                const url = element.currentTarget.getAttribute('data-url');

                deleteBookmark(url);
            });
        });
    }

    // Make functions global for onclick handlers
    window.restoreBookmark = (url, scrollY)=>  {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab.url === url) {
                chrome.tabs.sendMessage(currentTab.id, {
                    action: 'scrollToPosition',
                    scrollY: scrollY
                });
                showNotification('Progress restored!');
            } else {
                // Open the URL in a new tab and then scroll
                chrome.tabs.create({url: url}, (newTab) => {
                    // Wait a moment for the page to load
                    setTimeout(() => {
                        chrome.tabs.sendMessage(newTab.id, {
                            action: 'scrollToPosition',
                            scrollY: scrollY
                        });
                    }, 2000);
                });
            }
        });
    };

    window.deleteBookmark = (url) => {
        const key = `bookmark_${url}`;
        chrome.storage.local.remove([key], () => {
            loadBookmarks();
            showNotification('Bookmark deleted!');
        });
    };

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }
});