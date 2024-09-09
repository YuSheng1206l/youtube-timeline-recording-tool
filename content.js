// 監聽來自 popup 的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "getCurrentTime") {
		const progressBar = document.querySelector('.ytp-progress-bar');
		if (progressBar) {
			const currentTime = parseInt(progressBar.getAttribute('aria-valuenow'), 10); // 獲取當前時間（秒）
			const formattedTime = formatTime(currentTime);
			sendResponse({ currentTime: currentTime, formattedTime: formattedTime });
		} else {
			sendResponse({ currentTime: 0, formattedTime: '00:00:00' }); // 如果沒有進度條，返回0
		}
	} else if (request.action === "getVideoInfo") {
		getVideoInfo(sendResponse);
		return true; // 表示將異步發送響應
	}
});

function getVideoInfo(callback) {
	const maxAttempts = 10;
	let attempts = 0;

	function tryGetInfo() {
		const youtuberName = document.querySelector('yt-formatted-string.style-scope.ytd-channel-name a')?.textContent.trim() || '未知';
		const streamTitle = document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata')?.textContent.trim() || '未知';
		const channelElement = document.querySelector('yt-formatted-string.ytd-channel-name a.yt-simple-endpoint');

		if (youtuberName !== '未知' && streamTitle !== '未知') {
			const channelUrl = channelElement ? channelElement.href : '';
			const channelId = channelUrl.split('/').pop();
			callback({
				title: streamTitle,
				channelName: youtuberName,
				channelUrl: channelUrl,
				channelId: channelId
			});
		} else if (attempts < maxAttempts) {
			attempts++;
			setTimeout(tryGetInfo, 500); // 每500毫秒重試一次
		} else {
			callback({}); // 如果多次嘗試後仍然失敗，則返回空對象
		}
	}

	tryGetInfo();
}

// 格式化時間函數
function formatTime(seconds) {
	const date = new Date(null);
	date.setSeconds(seconds);
	return date.toISOString().substr(11, 8);
}

// 創建按鈕和彈出窗口
function createButton() {
	if (document.getElementById('yt-timestamp-button')) {
		return; // 如果按鈕已存在，則不再創建
	}

	const button = document.createElement('button');
	button.id = 'yt-timestamp-button';
	button.textContent = '時間軸';
	button.style.position = 'fixed';
	button.style.bottom = '20px';
	button.style.right = '20px';
	button.style.zIndex = '9999';
	document.body.appendChild(button);

	const popup = document.createElement('iframe');
	popup.id = 'yt-timestamp-popup';
	popup.style.position = 'fixed';
	popup.style.bottom = '80px';
	popup.style.right = '20px';
	popup.style.width = '300px';
	popup.style.height = '400px';
	popup.style.border = 'none';
	popup.style.zIndex = '10000';
	popup.style.display = 'none';
	popup.src = chrome.runtime.getURL('popup.html');
	document.body.appendChild(popup);

	button.addEventListener('click', () => {
		popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
	});

	console.log('Button created'); // 添加日誌
}

// 當頁面加載完成時創建按鈕
function initializeExtension() {
	console.log('Initializing extension'); // 添加日誌

	// 立即嘗試創建按鈕
	createButton();

	// 使用 MutationObserver 來監聽頁面變化
	const observer = new MutationObserver(function (mutations) {
		if (document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata')) {
			createButton();
			observer.disconnect();
			console.log('Button created after page mutation'); // 添加日誌
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});
}

// 當頁面加載完成時初始化擴展
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
	initializeExtension();
}

// 監聽 URL 變化
let lastUrl = location.href;
new MutationObserver(() => {
	const url = location.href;
	if (url !== lastUrl) {
		lastUrl = url;
		console.log('URL changed, reinitializing extension'); // 添加日誌
		initializeExtension();
	}
}).observe(document, { subtree: true, childList: true });