document.addEventListener('DOMContentLoaded', function () {
	updateCurrentStream();
	loadTimelineMarks();
	loadSettings();

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

	const tableTextColorInput = document.getElementById('tableTextColorInput');
	if (tableTextColorInput) {
		tableTextColorInput.addEventListener('input', function () {
			const tableTextColor = this.value;

			// 發送消息給 content.js 來即時應用新的表格文字顏色
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					action: "applyTableTextColor",
					color: tableTextColor
				});
			});
		});
	}

	const buttonColorInput = document.getElementById('buttonColorInput');
	if (buttonColorInput) {
		buttonColorInput.addEventListener('input', applySettings);
	}

	const panelColorInput = document.getElementById('panelColorInput');
	if (panelColorInput) {
		panelColorInput.addEventListener('input', applySettings);
	}

	const panelOpacityInput = document.getElementById('panelOpacityInput');
	if (panelOpacityInput) {
		panelOpacityInput.addEventListener('input', applySettings);
	}

	const timeTextColorInput = document.getElementById('timeTextColorInput');
	if (timeTextColorInput) {
		timeTextColorInput.addEventListener('input', function () {
			const timeTextColor = this.value;

			// 發送消息給 content.js 來即時應用新的時間文字顏色
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					action: "applyTimeTextColor",
					color: timeTextColor
				});
			});
		});
	}

	let currentMark = null; // 確保在使用之前初始化

	// 定義 applySettings 函數
	function applySettings() {
		const buttonColor = document.getElementById('buttonColorInput').value;
		const panelColor = document.getElementById('panelColorInput').value;
		const panelOpacity = document.getElementById('panelOpacityInput').value;

		// 發送消息給 content.js 來即時應用新的設定
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {
				action: "applySettings",
				buttonColor,
				panelColor,
				panelOpacity
			});
		});

		// 更新 body 的顏色
		document.body.style.backgroundColor = panelColor; // 更新 body 背景顏色
		document.body.style.color = (panelColor === '#ffffff') ? '#000000' : '#ffffff'; // 根據背景顏色調整文字顏色
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
						description: '',
						timestamp: new Date().toISOString()
					};
					chrome.runtime.sendMessage({ action: "saveTimelineMark", data: currentMark }, function () {
						loadTimelineMarks();
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
						<td>${formatTime(mark.time)}</td>
						<td><input type="text" class="form-control description-input" value="${mark.description}" data-index="${index}"></td>
						<td><button class="btn btn-sm btn-danger delete-mark" data-index="${index}">刪除</button></td>
					`;
					marksContainer.appendChild(row);
				});
				document.querySelectorAll('.delete-mark').forEach(button => {
					button.addEventListener('click', function () {
						deleteMark(this.getAttribute('data-index'));
					});
				});
				document.querySelectorAll('.description-input').forEach(input => {
					input.addEventListener('change', function () {
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
		chrome.storage.local.get(['buttonColor', 'panelColor', 'panelOpacity'], function (result) {
			if (result.buttonColor) {
				document.getElementById('buttonColorInput').value = result.buttonColor;
			}
			if (result.panelColor) {
				document.getElementById('panelColorInput').value = result.panelColor;
			}
			if (result.panelOpacity) {
				document.getElementById('panelOpacityInput').value = result.panelOpacity;
			}
		});
	}

	function saveSettings() {
		const buttonColor = document.getElementById('buttonColorInput').value;
		const panelColor = document.getElementById('panelColorInput').value;
		const panelOpacity = document.getElementById('panelOpacityInput').value;

		chrome.storage.local.set({
			buttonColor,
			panelColor,
			panelOpacity
		}, function () {
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, { action: "applySettings" });
			});
		});
	}

	function toggleSettings() {
		const settingsDiv = document.getElementById('settings');
		settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
	}

	function applyDefaultColors() {
		document.getElementById('buttonColorInput').value = '#007bff';
		document.getElementById('panelColorInput').value = '#ffffff';
		applySettings();
	}

	function applyDarkColors() {
		document.getElementById('buttonColorInput').value = '#ffffff';
		document.getElementById('panelColorInput').value = '#333333';
		applySettings();
	}

	function applyLightColors() {
		document.getElementById('buttonColorInput').value = '#000000';
		document.getElementById('panelColorInput').value = '#f8f9fa';
		applySettings();
	}
});