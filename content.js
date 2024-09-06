// 監聽來自 popup 或 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getCurrentTime') {
		const videoElement = document.querySelector('video');
		if (videoElement) {
			sendResponse({ currentTime: Math.floor(videoElement.currentTime) }); // 確保時間是整數秒
		} else {
			sendResponse({ currentTime: 0 }); // 如果沒有視頻元素，返回0
		}
	} else if (request.action === 'getStreamInfo') {
		const youtuberName = document.querySelector('yt-formatted-string.style-scope.ytd-channel-name a')?.textContent.trim() || '未知';
		const streamTitle = document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata')?.textContent.trim() || '未知';
		sendResponse({ youtuberName, streamTitle });
	} else if (request.action === 'applySettings') {
		const { buttonColor, panelColor, panelOpacity } = request;
		applySettings(document.getElementById('youtube-timeline-marker'), {
			buttonColor,
			panelColor,
			panelOpacity
		});
		sendResponse({ success: true });
	} else if (request.action === 'applyTableTextColor') {
		const tableTextColor = request.color;
		const timeCells = document.querySelectorAll('#timelineMarksTable td:first-child'); // 選擇所有時間單元格
		const descriptionCells = document.querySelectorAll('#timelineMarksTable td:nth-child(2)'); // 選擇所有描述單元格

		// 設置時間單元格的顏色
		timeCells.forEach(cell => {
			cell.style.color = tableTextColor; // 設置時間文字顏色
		});

		// 設置描述單元格的顏色
		descriptionCells.forEach(cell => {
			cell.style.color = tableTextColor; // 設置描述文字顏色
		});

		sendResponse({ success: true });
	} else if (request.action === 'applyTimeTextColor') {
		const timeTextColor = request.color;
		const timeCells = document.querySelectorAll('#timelineMarksTable td:first-child'); // 選擇所有時間單元格
		timeCells.forEach(cell => {
			cell.style.color = timeTextColor; // 設置時間文字顏色
		});
		sendResponse({ success: true });
	}
});

// 創建並添加按鈕
function addButton() {
	const button = document.createElement('button');
	button.id = 'youtube-timeline-marker';
	button.style.position = 'fixed';
	button.style.bottom = '20px';
	button.style.right = '20px';
	button.style.zIndex = '9999';
	button.style.width = '50px';
	button.style.height = '50px';
	button.style.backgroundColor = '#ff0000';
	button.style.backgroundImage = 'url(' + chrome.runtime.getURL('images/icon32.png') + ')';
	button.style.backgroundSize = 'cover';
	button.style.border = 'none';
	button.style.borderRadius = '50%';
	button.style.cursor = 'pointer';
	document.body.appendChild(button);

	button.addEventListener('click', togglePanel);
	applySettings(button);
}

// 應用設定到按鈕和面板
function applySettings(button, settings = {}) {
	chrome.storage.local.get(['buttonColor', 'panelColor', 'panelOpacity'], function (result) {
		const buttonColor = settings.buttonColor || result.buttonColor || '#ff0000';
		const panelColor = settings.panelColor || result.panelColor || '#fff';
		const panelOpacity = settings.panelOpacity || result.panelOpacity || '1';

		if (buttonColor) {
			button.style.backgroundColor = buttonColor;
		}
		if (panelColor || panelOpacity) {
			let panel = document.getElementById('youtube-timeline-panel');
			if (panel) {
				if (panelColor) {
					panel.style.backgroundColor = panelColor; // 確保這裡能正確設置背景顏色
				}
				if (panelOpacity) {
					panel.style.opacity = panelOpacity;
				}
			}
		}

		// 更新 body 的顏色
		document.body.style.backgroundColor = panelColor; // 更新 body 背景顏色
		document.body.style.color = (panelColor === '#ffffff') ? '#000000' : '#ffffff'; // 根據背景顏色調整文字顏色
	});
}

// 切換面板顯示
function togglePanel() {
	let panel = document.getElementById('youtube-timeline-panel');
	if (panel) {
		panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
	} else {
		createPanel();
	}
}

// 創建面板
function createPanel() {
	const panel = document.createElement('div');
	panel.id = 'youtube-timeline-panel';
	panel.style.position = 'fixed';
	panel.style.bottom = '80px';
	panel.style.right = '20px';
	panel.style.width = '400px';
	panel.style.height = '600px';
	panel.style.backgroundColor = '#fff';
	panel.style.border = '1px solid #ccc';
	panel.style.borderRadius = '10px';
	panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
	panel.style.zIndex = '10000';
	panel.style.overflow = 'hidden';

	const iframe = document.createElement('iframe');
	iframe.src = chrome.runtime.getURL('popup.html');
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.style.border = 'none';

	panel.appendChild(iframe);
	document.body.appendChild(panel);
	applySettings(panel);
}

// 在頁面加載完成後添加按鈕
window.addEventListener('load', addButton);