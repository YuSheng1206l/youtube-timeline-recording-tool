chrome.runtime.onInstalled.addListener(function () {
	console.log("YouTube 直播時間軸標記插件已安裝");
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "getCurrentTabInfo") {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			const tab = tabs[0];
			if (tab.url && tab.url.includes('youtube.com/watch')) {
				const urlParams = new URLSearchParams(new URL(tab.url).search);
				const videoId = urlParams.get('v');
				sendResponse({ videoId: videoId, tabId: tab.id });
			} else {
				sendResponse({});
			}
		});
		return true; // 表示將異步發送響應
	}
});