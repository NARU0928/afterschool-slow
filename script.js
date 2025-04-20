
document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value.trim();
    const feedback = document.getElementById('feedback');
    const programDropdown = document.getElementById('program-dropdown');
    const dateDropdown = document.getElementById('date-dropdown');
    const summaryDropdown = document.getElementById('summary-range-dropdown');
    const summaryControls = document.getElementById('summary-controls');
    const viewSummaryButton = document.getElementById('view-summary');
    const dataContainer = document.getElementById('data-container');
    const summaryContainer = document.getElementById('summary-container');
    const lineChartContainer = document.getElementById('line-chart-container');
    const summaryActivity = document.getElementById('summary-activity');
    const summaryHomeMessage = document.getElementById('summary-home-message');

    feedback.textContent = '';
    dataContainer.innerHTML = '';
    summaryContainer.style.display = 'none';
    programDropdown.innerHTML = `<option value="">프로그램명을 선택하세요</option>`;
    dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
    summaryDropdown.innerHTML = `<option value="">활동 종합 기준을 선택하세요</option>`;
    programDropdown.disabled = true;
    dateDropdown.disabled = true;
    summaryDropdown.disabled = true;
    viewSummaryButton.disabled = true;
    summaryControls.style.display = 'none';

    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || "YOUR_FALLBACK_API_KEY";
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || "YOUR_FALLBACK_SPREADSHEET_ID";

    const participantRange = '참여자 평가';
    const programContentRange = '프로그램 내용';
    const summaryRange = '종합 평가';

    async function fetchData(range) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
            );
            if (!response.ok) throw new Error('데이터를 가져오는 데 실패했습니다.');
            return (await response.json()).values;
        } catch (error) {
            console.error('오류 발생:', error);
            return null;
        }
    }

    const participantData = await fetchData(participantRange);
    const programContentData = await fetchData(programContentRange);
    const summaryData = await fetchData(summaryRange);

    if (!participantData || !programContentData || !summaryData) {
        feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        return;
    }

    const [, ...rows] = participantData;
    const [, ...programContentRows] = programContentData;
    const [, ...summaryRows] = summaryData;

    const filteredRows = rows.filter(row => row[8] === personalNumber || row[8] === parseInt(personalNumber));

    if (filteredRows.length > 0) {
        const programs = [...new Set(filteredRows.map(row => row[1]))];
        programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.textContent = program;
            programDropdown.appendChild(option);
        });
        programDropdown.disabled = false;

        programDropdown.addEventListener('change', () => {
            const selectedProgram = programDropdown.value;
            const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[4]))];
            dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
            dates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateDropdown.appendChild(option);
            });
            dateDropdown.disabled = false;

            // 종합 기준 활성화
            summaryDropdown.innerHTML = `<option value="">활동 종합 기준을 선택하세요</option>`;
            const matchedSummary = summaryRows.filter(row => row[1] === selectedProgram);
            matchedSummary.forEach(row => {
                const option = document.createElement('option');
                option.value = row[3]; // 종합기준명
                option.dataset.start = row[4]?.trim();
                option.dataset.end = row[5]?.trim();
                option.textContent = row[3];
                summaryDropdown.appendChild(option);
            });
            summaryDropdown.disabled = false;
            summaryControls.style.display = 'flex';
        });

        viewSummaryButton.addEventListener('click', () => {
            const selectedProgram = programDropdown.value;
            const selectedCriterion = summaryDropdown.options[summaryDropdown.selectedIndex];
            const startDate = selectedCriterion.dataset.start;
            const endDate = selectedCriterion.dataset.end;

            const programRows = filteredRows.filter(row => {
                return row[1] === selectedProgram &&
                    row[3] >= startDate && row[3] <= endDate;
            });

            if (programRows.length === 0) {
                alert("선택된 종합기준 내에 평가 데이터가 없습니다.");
                return;
            }

            const scoreMapping = {
                "매우 적극적": 5, "적극적": 4, "보통": 3, "소극적": 2, "참여 없음": 1,
                "100%-80%": 5, "80%-60%": 4, "60%-40%": 3, "40%-20%": 2, "20%-0%": 1,
                "매우 원활": 5, "원활": 4, "보통": 3, "미흡": 2, "협력 없음": 1,
                "매우 주도적": 5, "주도적": 4, "보통": 3, "수동적": 2, "의존적": 1
            };

            const labels = programRows.map(row => `차시 ${row[4]}`);
            const datasets = ['참여도', '성취도', '협력과 소통', '자기 주도성'].map((label, i) => {
                const index = 9 + i;
                return {
                    label,
                    data: programRows.map(row => scoreMapping[row[index]?.trim()] || 0),
                    fill: false,
                    borderWidth: 2,
                    tension: 0.2
                };
            });

            lineChartContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            lineChartContainer.appendChild(canvas);

            new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: datasets.map((ds, idx) => ({
                        ...ds,
                        borderColor: `hsl(${idx * 90}, 70%, 50%)`,
                        backgroundColor: `hsl(${idx * 90}, 70%, 90%)`,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }))
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } }
                }
            });

            // 활동내용/가정전달 종합 평가 시트에서 불러오기
            const matchedSummaryRow = summaryRows.find(row =>
                row[1] === selectedProgram && row[7] === filteredRows[0][8] // 개인번호 일치
            );
            summaryActivity.innerHTML = matchedSummaryRow ? `<p>${matchedSummaryRow[9]}</p>` : '내용 없음';
            summaryHomeMessage.innerHTML = matchedSummaryRow ? `<p>${matchedSummaryRow[10]}</p>` : '내용 없음';

            summaryContainer.style.display = 'block';
        });
    } else {
        feedback.textContent = '일치하는 내용이 없습니다.';
    }
});
