document.addEventListener('DOMContentLoaded', function () {
	updateCurrentStream();
	loadTimelineMarks();
	loadSettings();

	// 綁定事件監聽器
	document.getElementById('markTimeBtn').addEventListener('click', markCurrentTime);
	document.getElementById('exportBtn').addEventListener('click', exportRecords);
	document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importInput').click());
	document.getElementById('importInput').addEventListener('change', importRecords);
	document.getElementById('showSettingsBtn').addEventListener('click', toggleSettings);

	// 新增導出當前直播的事件監聽器
	document.getElementById('exportCurrentLiveBtn').addEventListener('click', exportCurrentLive);

	// 新增清除歷史資料的事件監聽器
	document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

	// 顏色組合選擇
	const colorSchemeSelect = document.getElementById('colorSchemeSelect');
	if (colorSchemeSelect) {
		colorSchemeSelect.addEventListener('change', function () {
			const selectedScheme = this.value;
			switch (selectedScheme) {
				case 'default':
					applyDefaultColors();
					break;
				case 'dark':
					applyDarkColors();
					break;
				case 'light':
					applyLightColors();
					break;
			}
		});
	}

	// 文字顏色選擇
	document.getElementById('bodyTextColorInput').addEventListener('input', function () {
		const bodyTextColor = this.value;
		document.body.style.color = bodyTextColor; // 即時應用新的 body 文字顏色
	});

	// 按鈕顏色選擇
	document.getElementById('buttonColorInput').addEventListener('input', function () {
		const buttonColor = this.value;
		document.getElementById('markTimeBtn').style.backgroundColor = buttonColor; // 即時更新按鈕顏色
	});

	// 視窗顏色選擇
	document.getElementById('panelColorInput').addEventListener('input', function () {
		const panelColor = this.value;
		document.body.style.backgroundColor = panelColor; // 即時更新視窗背景顏色
	});

	// 視窗透明度選擇
	document.getElementById('panelOpacityInput').addEventListener('input', function () {
		const panelOpacity = this.value;
		document.body.style.opacity = panelOpacity; // 即時更新視窗透明度
	});

	// 確保按鈕存在後再綁定事件
	const markTimeBtn = document.getElementById('markTimeBtn');
	if (markTimeBtn) {
		markTimeBtn.addEventListener('click', markCurrentTime);
	}

	const exportBtn = document.getElementById('exportBtn');
	if (exportBtn) {
		exportBtn.addEventListener('click', exportRecords);
	}

	const importBtn = document.getElementById('importBtn');
	if (importBtn) {
		importBtn.addEventListener('click', () => document.getElementById('importInput').click());
	}

	const importInput = document.getElementById('importInput');
	if (importInput) {
		importInput.addEventListener('change', importRecords);
	}

	const saveSettingsBtn = document.getElementById('saveSettingsBtn');
	if (saveSettingsBtn) {
		saveSettingsBtn.addEventListener('click', saveSettings);
	}

	const showSettingsBtn = document.getElementById('showSettingsBtn');
	if (showSettingsBtn) {
		showSettingsBtn.addEventListener('click', toggleSettings);
	}

	let currentMark = null; // 確保在使用之前初始化

	// 定義 applySettings 函數
	function applySettings() {
		const buttonColor = document.getElementById('buttonColorInput').value;
		const panelColor = document.getElementById('panelColorInput').value;
		const panelOpacity = document.getElementById('panelOpacityInput').value;
		const bodyTextColor = document.getElementById('bodyTextColorInput').value;

		// 更新插件視窗的 body 顏色
		document.body.style.backgroundColor = panelColor; // 更新 body 背景顏色
		document.body.style.color = bodyTextColor; // 更新 body 文字顏色
		document.body.style.opacity = panelOpacity; // 更新 body 透明度
	}

	function updateCurrentStream() {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (tabs.length > 0) {
				chrome.tabs.sendMessage(tabs[0].id, { action: "getStreamInfo" }, function (response) {
					if (chrome.runtime.lastError) {
						console.error(chrome.runtime.lastError);
						return;
					}
					if (response) {
						document.getElementById('streamTitle').textContent = response.streamTitle;
						document.getElementById('youtuberName').textContent = response.youtuberName;
					}
				});
			}
		});
	}

	function markCurrentTime() {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, { action: "getCurrentTime" }, function (response) {
				if (response) {
					currentMark = {
						time: Math.floor(response.currentTime),
						description: '', // 這裡不需要清空描述
						timestamp: new Date().toISOString()
					};
					chrome.runtime.sendMessage({ action: "saveTimelineMark", data: currentMark }, function () {
						loadTimelineMarks(); // 重新加載標記
					});
				}
			});
		});
	}

	function loadTimelineMarks() {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			chrome.runtime.sendMessage({ action: "getTimelineMarks", tabId: tabs[0].id }, function (marks) {
				const marksContainer = document.getElementById('timelineMarks');
				marksContainer.innerHTML = '';
				marks.forEach((mark, index) => {
					const row = document.createElement('tr');
					row.innerHTML = `
						<td class="time-cell">${formatTime(mark.time)}</td>
						<td><input type="text" class="form-control description-input" value="${mark.description}" data-index="${index}"></td>
						<td><button class="btn btn-sm btn-danger delete-mark" data-index="${index}">X</button></td>
					`;
					marksContainer.appendChild(row);
				});
				document.querySelectorAll('.delete-mark').forEach(button => {
					button.addEventListener('click', function () {
						deleteMark(this.getAttribute('data-index'));
					});
				});
				document.querySelectorAll('.description-input').forEach(input => {
					input.addEventListener('blur', function () { // 使用 blur 事件來保存描述
						const index = this.getAttribute('data-index');
						const newDescription = this.value;
						updateDescription(index, newDescription);
					});
				});
			});
		});
	}

	function deleteMark(index) {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			chrome.runtime.sendMessage({ action: "deleteTimelineMark", tabId: tabs[0].id, index: parseInt(index) }, function () {
				loadTimelineMarks();
			});
		});
	}

	function updateDescription(index, newDescription) {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			chrome.runtime.sendMessage({ action: "updateTimelineMark", tabId: tabs[0].id, index: parseInt(index), description: newDescription }, function () {
				loadTimelineMarks();
			});
		});
	}

	function formatTime(seconds) {
		const date = new Date(null);
		date.setSeconds(seconds);
		return date.toISOString().substr(11, 8);
	}

	function exportRecords() {
		chrome.storage.local.get('timelineMarks', function (result) {
			const dataStr = JSON.stringify(result.timelineMarks);
			const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
			const exportFileDefaultName = 'youtube_timeline_marks.json';

			const linkElement = document.createElement('a');
			linkElement.setAttribute('href', dataUri);
			linkElement.setAttribute('download', exportFileDefaultName);
			linkElement.click();
		});
	}

	function importRecords(event) {
		const file = event.target.files[0];
		const reader = new FileReader();
		reader.onload = function (e) {
			const contents = e.target.result;
			try {
				const importedData = JSON.parse(contents);
				chrome.storage.local.set({ timelineMarks: importedData }, function () {
					loadTimelineMarks();
					alert('導入成功！');
				});
			} catch (error) {
				alert('導入失敗，請確保文件格式正確。');
			}
		};
		reader.readAsText(file);
	}

	function loadSettings() {
		chrome.storage.local.get(['buttonColor', 'panelColor', 'panelOpacity', 'bodyTextColor'], function (result) {
			if (result.buttonColor) {
				document.getElementById('buttonColorInput').value = result.buttonColor;
			}
			if (result.panelColor) {
				document.getElementById('panelColorInput').value = result.panelColor;
			}
			if (result.panelOpacity) {
				document.getElementById('panelOpacityInput').value = result.panelOpacity;
			}
			if (result.bodyTextColor) {
				document.getElementById('bodyTextColorInput').value = result.bodyTextColor;
			}
		});
	}

	function saveSettings() {
		const buttonColor = document.getElementById('buttonColorInput').value;
		const panelColor = document.getElementById('panelColorInput').value;
		const panelOpacity = document.getElementById('panelOpacityInput').value;
		const bodyTextColor = document.getElementById('bodyTextColorInput').value;

		chrome.storage.local.set({
			buttonColor,
			panelColor,
			panelOpacity,
			bodyTextColor
		}, function () {
			applySettings(); // 即時應用設定
		});
	}

	function toggleSettings() {
		const settingsDiv = document.getElementById('settings');
		settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
	}
});

// 定義 applySettings 函數
function applySettings() {
	const buttonColor = document.getElementById('buttonColorInput').value;
	const panelColor = document.getElementById('panelColorInput').value;
	const panelOpacity = document.getElementById('panelOpacityInput').value;
	const bodyTextColor = document.getElementById('bodyTextColorInput').value;

	// 更新插件視窗的 body 顏色
	document.body.style.backgroundColor = panelColor; // 更新 body 背景顏色
	document.body.style.color = bodyTextColor; // 更新 body 文字顏色
	document.body.style.opacity = panelOpacity; // 更新 body 透明度
}

function applyDefaultColors() {
	document.getElementById('buttonColorInput').value = '#007bff'; // 預設按鈕顏色
	document.getElementById('panelColorInput').value = '#ffffff'; // 預設面板顏色
	document.getElementById('bodyTextColorInput').value = '#000000'; // 預設文字顏色
	applySettings(); // 應用設定
}

function applyDarkColors() {
	document.getElementById('buttonColorInput').value = '#ffffff'; // 深色按鈕顏色
	document.getElementById('panelColorInput').value = '#333333'; // 深色面板顏色
	document.getElementById('bodyTextColorInput').value = '#ffffff'; // 深色文字顏色
	applySettings(); // 應用設定
}

function applyLightColors() {
	document.getElementById('buttonColorInput').value = '#000000'; // 淺色按鈕顏色
	document.getElementById('panelColorInput').value = '#f8f9fa'; // 淺色面板顏色
	document.getElementById('bodyTextColorInput').value = '#000000'; // 淺色文字顏色
	applySettings(); // 應用設定
}

// 導出當前直播的 TXT 文件
function exportCurrentLive() {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { action: "getStreamInfo" }, function (response) {
			if (response) {
				const liveInfo = `當前直播：${response.streamTitle}\n主播：${response.youtuberName}`;
				const blob = new Blob([liveInfo], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'current_live_info.txt';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}
		});
	});
}

// 清除歷史資料
function clearHistory() {
	chrome.storage.local.set({ timelineMarks: {} }, function () {
		alert('歷史資料已清除！');
		loadTimelineMarks(); // 重新加載標記
	});
}