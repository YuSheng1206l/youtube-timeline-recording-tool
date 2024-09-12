document.addEventListener('DOMContentLoaded', function () {
	const markTimeButton = document.getElementById('markTimeButton');
	const descriptionInput = document.getElementById('descriptionInput');
	const markedTimesList = document.getElementById('markedTimesList');
	const videoInfo = document.getElementById('videoInfo');
	const settingsButton = document.getElementById('settingsButton');
	const settingsPanel = document.getElementById('settingsPanel');
	const exportButton = document.getElementById('exportButton');
	const importButton = document.getElementById('importButton');
	const importInput = document.getElementById('importInput');
	const toggleThemeButton = document.getElementById('toggleThemeButton');
	const backToMainButton = document.getElementById('backToMainButton');
	const exportTxtButton = document.getElementById('exportTxtButton');
	const clearHistoryButton = document.getElementById('clearHistoryButton');
	const markTimeButtonFooter = document.getElementById('markTimeButtonFooter');

	let currentVideoId = '';
	let currentVideoInfo = {};
	let currentTabId = null;

	// 獲取當前標籤頁的 YouTube 視頻信息
	function getVideoInfo() {
		chrome.runtime.sendMessage({ action: "getCurrentTabInfo" }, function (response) {
			if (response && response.videoId) {
				currentVideoId = response.videoId;
				currentTabId = response.tabId;

				// 從 content script 獲取視頻信息
				chrome.tabs.sendMessage(currentTabId, { action: "getVideoInfo" }, function (response) {
					if (response && response.title && response.channelName && response.channelUrl) {
						currentVideoInfo = response;
						updateVideoInfo();
						updateMarkedTimesList();
					} else {
						console.log('Failed to get video info:', response);
						// 如果獲取失敗，5秒後重試
						setTimeout(getVideoInfo, 5000);
					}
				});
			} else {
				console.log('Failed to get current tab info:', response);
			}
		});
	}

	getVideoInfo(); // 調用獲取視頻信息的函數

	function updateVideoInfo() {
		videoInfo.innerHTML = `
      <h2>${currentVideoInfo.title}</h2>
      <h3>直播主：${currentVideoInfo.channelName} (ID: ${currentVideoInfo.channelId})</h3>
    `;
	}

	// 標記時間的函數
	function markTime() {
		console.log('Mark time clicked');
		if (currentVideoId && currentTabId) {
			chrome.tabs.sendMessage(currentTabId, { action: "getCurrentTime" }, function (response) {
				if (response) {
					const timestamp = response.currentTime;
					const formattedTime = response.formattedTime;
					const description = descriptionInput.value;
					saveTimeMarker(timestamp, formattedTime, description);
					descriptionInput.value = '';
				}
			});
		}
	}

	// 為上面的按鈕添加事件監聽器
	if (markTimeButton) {
		markTimeButton.addEventListener('click', markTime);
	}

	// 為底部的按鈕添加事件監聽器，觸發上面按鈕的點擊事件
	if (markTimeButtonFooter) {
		markTimeButtonFooter.addEventListener('click', function () {
			console.log('Footer mark time button clicked');
			markTimeButton.click(); // 觸發上面按鈕的點擊事件
		});
	}

	// 保存時間標記
	function saveTimeMarker(timestamp, formattedTime, description) {
		chrome.storage.local.get({ timeMarkers: {} }, function (result) {
			if (!result.timeMarkers[currentVideoInfo.channelUrl]) {
				result.timeMarkers[currentVideoInfo.channelUrl] = {};
			}
			if (!result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName]) {
				result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName] = {};
			}
			if (!result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title]) {
				result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title] = {
					url: window.location.href,
					markers: []
				};
			}

			// 確保 markers 數組存在
			if (!Array.isArray(result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title].markers)) {
				result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title].markers = [];
			}

			result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title].markers.push({
				formattedTime: formattedTime,
				description: description,
				timestamp: timestamp
			});

			chrome.storage.local.set({ timeMarkers: result.timeMarkers }, function () {
				console.log('Time marker saved');
				updateMarkedTimesList();
			});
		});
	}

	// 更新標記列表
	function updateMarkedTimesList() {
		chrome.storage.local.get({ timeMarkers: {} }, function (result) {
			const markers = result.timeMarkers[currentVideoInfo.channelUrl]?.[currentVideoInfo.channelName]?.[currentVideoInfo.title]?.markers || [];
			markedTimesList.innerHTML = '';

			if (markers.length === 0) {
				markedTimesList.innerHTML = '<p>暫無標記</p>';
				markedTimesList.style.display = 'none'; // 隱藏標記列表
			} else {
				markedTimesList.style.display = 'block'; // 顯示標記列表
				markers.forEach((marker, index) => {
					const markerElement = document.createElement('div');
					markerElement.innerHTML = `
          <span class="time">${marker.formattedTime}</span>
          <input type="text" class="description" value="${marker.description}" data-index="${index}">
          <button class="deleteButton" data-index="${index}">刪除</button>
        `;
					markedTimesList.appendChild(markerElement);
				});
			}
			addMarkerListeners();

			markedTimesList.scrollTop = markedTimesList.scrollHeight; // 滾動到最新標記
		});
	}

	// 添加標記列表的事件監聽器
	function addMarkerListeners() {
		const descriptionInputs = document.querySelectorAll('.description');
		const deleteButtons = document.querySelectorAll('.deleteButton');

		descriptionInputs.forEach(input => {
			input.addEventListener('change', function () {
				const index = this.getAttribute('data-index');
				editMarker(index, this.value);
			});
		});

		deleteButtons.forEach(button => {
			button.addEventListener('click', function () {
				const index = this.getAttribute('data-index');
				deleteMarker(index);
			});
		});
	}

	// 編輯標記
	function editMarker(index, newDescription) {
		chrome.storage.local.get({ timeMarkers: {} }, function (result) {
			const markers = result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title].markers;
			markers[index].description = newDescription;
			chrome.storage.local.set({ timeMarkers: result.timeMarkers }, function () {
				updateMarkedTimesList();
			});
		});
	}

	// 刪除標記
	function deleteMarker(index) {
		if (confirm("確定要刪除這個標記嗎？")) {
			chrome.storage.local.get({ timeMarkers: {} }, function (result) {
				result.timeMarkers[currentVideoInfo.channelUrl][currentVideoInfo.channelName][currentVideoInfo.title].markers.splice(index, 1);
				chrome.storage.local.set({ timeMarkers: result.timeMarkers }, function () {
					updateMarkedTimesList();
				});
			});
		}
	}

	// 設置按鈕
	if (settingsButton) {
		settingsButton.addEventListener('click', function () {
			console.log('Settings clicked');
			document.getElementById('app').style.display = 'none';
			settingsPanel.style.display = 'block';
		});
	}

	// 返回主界面按鈕
	if (backToMainButton) {
		backToMainButton.addEventListener('click', function () {
			console.log('Back to main clicked');
			settingsPanel.style.display = 'none';
			document.getElementById('app').style.display = 'block';
		});
	}

	// 導出 JSON 記錄
	if (exportButton) {
		exportButton.addEventListener('click', function () {
			console.log('Export JSON clicked');
			chrome.storage.local.get({ timeMarkers: {} }, function (result) {
				const dataStr = JSON.stringify(result.timeMarkers, null, 2); // 使用縮進來格式化 JSON
				const blob = new Blob([dataStr], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = 'youtube_time_markers.json';
				document.body.appendChild(a);
				a.click();
				setTimeout(function () {
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
				}, 100);
			});
		});
	}

	// 導入記錄
	if (importButton) {
		importButton.addEventListener('click', function () {
			console.log('Import clicked');
			importInput.click();
		});
	}

	if (importInput) {
		importInput.addEventListener('change', function (event) {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = function (e) {
					try {
						const importedData = JSON.parse(e.target.result);
						chrome.storage.local.set({ timeMarkers: importedData }, function () {
							alert("記錄導入成功！");
							updateMarkedTimesList();
						});
					} catch (error) {
						alert("導入失敗，請確保文件格式正確。");
					}
				};
				reader.readAsText(file);
			}
		});
	}

	// 切換主題
	if (toggleThemeButton) {
		toggleThemeButton.addEventListener('click', function () {
			console.log('Toggle theme clicked');
			document.body.classList.toggle('dark-mode');
			chrome.storage.local.get({ darkMode: false }, function (result) {
				chrome.storage.local.set({ darkMode: !result.darkMode });
			});
		});
	}

	// 初始化主題
	chrome.storage.local.get({ darkMode: false }, function (result) {
		if (result.darkMode) {
			document.body.classList.add('dark-mode');
		}
	});

	// 添加 TXT 導出功能
	if (exportTxtButton) {
		exportTxtButton.addEventListener('click', function () {
			console.log('Export TXT clicked');
			exportTxt();
		});
		console.log('Export TXT button listener added');
	}

	// 清除歷史記錄
	if (clearHistoryButton) {
		clearHistoryButton.addEventListener('click', function () {
			console.log('Clear history clicked');
			if (confirm("確定要清除所有歷史記錄嗎？此操作不可撤銷。")) {
				chrome.storage.local.set({ timeMarkers: {} }, function () {
					console.log('All history cleared');
					updateMarkedTimesList();
				});
			}
		});
	}

	// 添加消息監聽器
	window.addEventListener('message', function (event) {
		if (event.data.action === 'refreshVideoInfo') {
			console.log('Refresh video info');
			getVideoInfo();
		}
	});

	// 導出 TXT 的函數
	function exportTxt() {
		chrome.storage.local.get({ timeMarkers: {} }, function (result) {
			let txtContent = '';
			const currentMarkers = result.timeMarkers[currentVideoInfo.channelUrl]?.[currentVideoInfo.channelName]?.[currentVideoInfo.title];

			if (currentMarkers) {
				txtContent += `標題: ${currentVideoInfo.title}\n`;
				txtContent += `頻道: ${currentVideoInfo.channelName}\n`;
				txtContent += `URL: ${currentMarkers.url}\n`;
				txtContent += '時間標記:\n';
				currentMarkers.markers.forEach(marker => {
					txtContent += `  ${marker.formattedTime} - ${marker.description}\n`;
				});
			} else {
				txtContent = '當前頁面沒有時間標記。';
			}

			const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.style.display = 'none';
			a.href = url;
			a.download = 'youtube_timestamps.txt';
			document.body.appendChild(a);
			a.click();
			setTimeout(function () {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			}, 100);
		});
	}

	// 確保所有按鈕都正確獲取
	console.log('Buttons:', {
		markTimeButton,
		settingsButton,
		exportButton,
		importButton,
		toggleThemeButton,
		backToMainButton,
		exportTxtButton,
		clearHistoryButton,
		markTimeButtonFooter
	});
});