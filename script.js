
// 최종 script.js with summaryDropdown 선언 포함 및 Bar Chart 반영

document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value.trim();
    const feedback = document.getElementById('feedback');
    const programDropdown = document.getElementById('program-dropdown');
    const dateDropdown = document.getElementById('date-dropdown');
    const summaryDropdown = document.getElementById('summary-range-dropdown');
    const dataContainer = document.getElementById('data-container');
    const summaryContainer = document.getElementById('summary-container');
    const summaryInfo = document.getElementById('summary-info-container');
    const lineChartContainer = document.getElementById('line-chart-container');
    const summaryActivity = document.getElementById('summary-activity');
    const summaryHomeMessage = document.getElementById('summary-home-message');

    if (feedback) feedback.textContent = '';
    dataContainer.innerHTML = '';
    summaryContainer.style.display = 'none';
    summaryInfo.innerHTML = '';
    lineChartContainer.innerHTML = '';
    summaryActivity.innerHTML = '';
    summaryHomeMessage.innerHTML = '';
    programDropdown.innerHTML = `<option value="">프로그램명을 선택하세요</option>`;
    dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
    summaryDropdown.innerHTML = `<option value="">활동 종합 기준을 선택하세요</option>`;
    programDropdown.disabled = true;
    dateDropdown.disabled = true;
    summaryDropdown.disabled = true;

    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

    async function fetchData(range) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`);
        if (!res.ok) return null;
        return (await res.json()).values;
    }

    const participantData = await fetchData('참여자 평가');
    const programContentData = await fetchData('프로그램 내용');
    const summaryData = await fetchData('종합 평가');

    if (!participantData || !programContentData || !summaryData) {
        if (feedback) feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        return;
    }

    const [, ...rows] = participantData;
    const [, ...programContentRows] = programContentData;
    const [, ...summaryRows] = summaryData;

    const filteredRows = rows.filter(row => row[8] === personalNumber || row[8] === parseInt(personalNumber));

    if (filteredRows.length === 0) {
        if (feedback) feedback.textContent = '일치하는 내용이 없습니다.';
        return;
    }

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
        summaryContainer.style.display = 'none';
        summaryInfo.innerHTML = '';
        lineChartContainer.innerHTML = '';
        summaryActivity.innerHTML = '';
        summaryHomeMessage.innerHTML = '';
        dataContainer.innerHTML = '';

        const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[4]))];
        dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateDropdown.appendChild(option);
        });
        dateDropdown.disabled = false;

        summaryDropdown.innerHTML = `<option value="">활동 종합 기준을 선택하세요</option>`;
        const matchedSummary = summaryRows.filter(row => row[1] === selectedProgram);
        matchedSummary.forEach(row => {
            const option = document.createElement('option');
            option.value = row[3];
            option.dataset.start = row[4]?.trim();
            option.dataset.end = row[5]?.trim();
            option.dataset.program = row[1];
            option.dataset.teacher = row[2];
            option.dataset.name = row[6];
            option.dataset.pid = row[7];
            option.textContent = row[3];
            summaryDropdown.appendChild(option);
        });
        summaryDropdown.disabled = false;
    });

    summaryDropdown.addEventListener('change', () => {
        const selectedCriterion = summaryDropdown.options[summaryDropdown.selectedIndex];
        const selectedProgram = selectedCriterion.dataset.program;
        const startDate = selectedCriterion.dataset.start;
        const endDate = selectedCriterion.dataset.end;

        const programRows = filteredRows.filter(row =>
            row[1] === selectedProgram &&
            row[3] >= startDate &&
            row[3] <= endDate
        );

        if (programRows.length === 0) {
            summaryContainer.style.display = 'none';
            return;
        }

        summaryInfo.innerHTML = `
            <div class="section-title">활동 종합 기준</div>
            <div style="padding: 15px 10px;">
                <p><strong>• 프로그램명 :</strong> ${selectedCriterion.dataset.program}</p>
                <p><strong>• 강사명 :</strong> ${selectedCriterion.dataset.teacher}</p>
                <p><strong>• 종합기준 :</strong> ${selectedCriterion.value}</p>
                <p><strong>• 시작일 :</strong> ${startDate}</p>
                <p><strong>• 종료일 :</strong> ${endDate}</p>
                <p><strong>• 참여학생(회원번호) :</strong> ${selectedCriterion.dataset.name} (${selectedCriterion.dataset.pid})</p>
            </div>
        `;

        const scoreMapping = {
            "매우 적극적": 5, "적극적": 4, "보통": 3, "소극적": 2, "참여 없음": 1,
            "100%-80%": 5, "80%-60%": 4, "60%-40%": 3, "40%-20%": 2, "20%-0%": 1,
            "매우 원활": 5, "원활": 4, "보통": 3, "미흡": 2, "협력 없음": 1,
            "매우 주도적": 5, "주도적": 4, "보통": 3, "수동적": 2, "의존적": 1
        };

        const chartLabels = programRows.map(row => `차시 ${row[4]}`);
        const categories = ['참여도', '성취도', '협력과 소통', '자기 주도성'];
        const categoryIndices = [9, 10, 11, 12];

        const datasets = categories.map((label, catIndex) => ({
            label,
            data: programRows.map(row => scoreMapping[row[categoryIndices[catIndex]]?.trim()] || 0),
            backgroundColor: `hsl(${catIndex * 90}, 70%, 70%)`
        }));

        lineChartContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        lineChartContainer.appendChild(canvas);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 5,
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        stacked: true
                    }
                }
            }
        });

        const matchedSummaryRow = summaryRows.find(row =>
            row[1] === selectedProgram && row[7] === filteredRows[0][8]
        );
        summaryActivity.innerHTML = matchedSummaryRow ? `<p>${matchedSummaryRow[8]}</p>` : '내용 없음';
        summaryHomeMessage.innerHTML = matchedSummaryRow ? `<p>${matchedSummaryRow[9]}</p>` : '내용 없음';

        summaryContainer.style.display = 'block';
        dataContainer.innerHTML = '';
    });
});
