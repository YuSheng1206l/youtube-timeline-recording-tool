chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({ timelineMarks: {}, buttonColor: '#ff0000', panelColor: '#fff', panelOpacity: '1' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'saveTimelineMark') {
		saveTimelineMark(request.data, sender.tab.id, sendResponse);
		return true; // 保持訊息通道開放
	} else if (request.action === 'getTimelineMarks') {
		getTimelineMarks(request.tabId, sendResponse);
		return true; // 保持訊息通道開放
	} else if (request.action === 'deleteTimelineMark') {
		deleteTimelineMark(request.tabId, request.index, sendResponse);
		return true; // 保持訊息通道開放
	} else if (request.action === 'updateTimelineMark') {
		updateTimelineMark(request.data, sender.tab.id, sendResponse);
		return true; // 保持訊息通道開放
	}
});

function saveTimelineMark(data, tabId, sendResponse) {
	chrome.storage.local.get('timelineMarks', (result) => {
		const timelineMarks = result.timelineMarks || {};
		if (!timelineMarks[tabId]) {
			timelineMarks[tabId] = [];
		}
		timelineMarks[tabId].push(data);
		chrome.storage.local.set({ timelineMarks }, sendResponse);
	});
}

function getTimelineMarks(tabId, sendResponse) {
	chrome.storage.local.get('timelineMarks', (result) => {
		const timelineMarks = result.timelineMarks || {};
		sendResponse(timelineMarks[tabId] || []);
	});
}

function deleteTimelineMark(tabId, index, sendResponse) {
	chrome.storage.local.get('timelineMarks', (result) => {
		const timelineMarks = result.timelineMarks || {};
		if (timelineMarks[tabId]) {
			timelineMarks[tabId].splice(index, 1);
			chrome.storage.local.set({ timelineMarks }, sendResponse);
		}
	});
}

function updateTimelineMark(data, tabId, sendResponse) {
	chrome.storage.local.get('timelineMarks', (result) => {
		const timelineMarks = result.timelineMarks || {};
		if (timelineMarks[tabId]) {
			const index = timelineMarks[tabId].findIndex(mark => mark.timestamp === data.timestamp);
			if (index !== -1) {
				timelineMarks[tabId][index] = data;
				chrome.storage.local.set({ timelineMarks }, sendResponse);
			}
		}
	});
}