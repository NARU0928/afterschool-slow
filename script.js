
document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value.trim();
    const feedback = document.getElementById('feedback');
    const programDropdown = document.getElementById('program-dropdown');
    const dateDropdown = document.getElementById('date-dropdown');
    const dataContainer = document.getElementById('data-container');
    const viewSummaryButton = document.getElementById('view-summary');
    const summaryContainer = document.getElementById('summary-container');
    const lineChartContainer = document.getElementById('line-chart-container');
    const summaryActivity = document.getElementById('summary-activity');
    const summaryHomeMessage = document.getElementById('summary-home-message');

    feedback.textContent = '';
    dataContainer.innerHTML = '';
    summaryContainer.style.display = 'none';
    programDropdown.innerHTML = `<option value="">프로그램명을 선택하세요</option>`;
    dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
    programDropdown.disabled = true;
    dateDropdown.disabled = true;
    viewSummaryButton.disabled = true;

    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || "YOUR_FALLBACK_API_KEY";
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || "YOUR_FALLBACK_SPREADSHEET_ID";

    const participantRange = '참여자 평가';
    const programContentRange = '프로그램 내용';

    async function fetchData(range) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
            );
            if (!response.ok) throw new Error('데이터를 가져오는 데 실패했습니다.');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('오류 발생:', error);
            return null;
        }
    }

    const participantData = await fetchData(participantRange);
    const programContentData = await fetchData(programContentRange);

    if (!participantData || !participantData.values || !programContentData || !programContentData.values) {
        feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        return;
    }

    const [headers, ...rows] = participantData.values;
    const [, ...programContentRows] = programContentData.values;
    const filteredRows = rows.filter(row => row[8] === personalNumber || row[8] === parseInt(personalNumber));

    if (filteredRows.length > 0) {
        feedback.textContent = '';
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
            dateDropdown.innerHTML = `<option value="">회차를 선택하세요</option>`;
            const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[4]))];
            dates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateDropdown.appendChild(option);
            });
            dateDropdown.disabled = false;
            viewSummaryButton.disabled = !selectedProgram;
        });

        dateDropdown.addEventListener('change', () => {
            const selectedProgram = programDropdown.value;
            const selectedDate = dateDropdown.value;
            const finalRows = filteredRows.filter(row => row[1] === selectedProgram && row[4] === selectedDate);
            dataContainer.innerHTML = '';
            summaryContainer.style.display = 'none';

            finalRows.forEach(row => {
                const programContent = programContentRows.filter(
                    contentRow => contentRow[1] === row[1] && contentRow[4] === row[4]
                );
                const groupedContent = programContent.reduce((acc, content) => {
                    const category = content[6];
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(`- ${content[7]}`);
                    return acc;
                }, {});
                dataContainer.innerHTML = `
                    <div class="grid-container">
                        <div class="grid-item left">
                            <div class="section-title">참여정보</div>
                            <p><strong>• 프로그램명 :</strong> ${row[1]}</p>
                            <p><strong>• 강사명 :</strong> ${row[2]}</p>
                            <p><strong>• 수업일자 :</strong> ${row[3]}</p>
                            <p><strong>• 수업목표 :</strong> ${row[6]}</p>
                            <p><strong>• 참여학생(회원번호) :</strong> ${row[7]} (${row[8]})</p>
                        </div>
                        <div class="grid-item right">
                            <div class="section-title">활동내용</div>
                            ${Object.entries(groupedContent)
                                .map(([category, activities]) => `<p>[${category}]<br>${activities.join('<br>')}</p>`)
                                .join('')}
                        </div>
                    </div>
                    <div class="grid-container">
                        <div class="grid-item left">
                            <div class="section-title">활동분석</div>
                            <div id="graph-container" style="width: 100%; height: 200px; margin-bottom: 10px;"></div>
                            <p style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <span>• 참여도 : ${row[9]}</span>
                                <span>• 성취도 : ${row[10]}</span>
                                <span>• 협력과 소통 : ${row[11]}</span>
                                <span>• 자기 주도성 : ${row[12]}</span>
                            </p>
                        </div>
                        <div class="grid-item right">
                            <div class="section-title">피드백 및 안내</div>
                            <div class="one-line-review">${row[13]}</div>
                        </div>
                    </div>
                `;
                renderGraph(row);
            });
        });

        viewSummaryButton.addEventListener('click', () => {
            const selectedProgram = programDropdown.value;
            const programRows = filteredRows.filter(row => row[1] === selectedProgram);
            programRows.sort((a, b) => parseInt(a[4]) - parseInt(b[4]));

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
                    scales: {
                        y: { min: 0, max: 5, ticks: { stepSize: 1 } }
                    }
                }
            });

            summaryActivity.innerHTML = programRows.map(r => `<p>- ${r[13]}</p>`).join('');
            summaryHomeMessage.innerHTML = programRows.map(r => `<p>- ${r[14]}</p>`).join('');
            summaryContainer.style.display = 'block';
        });

    } else {
        feedback.textContent = '일치하는 내용이 없습니다.';
    }
});

function renderGraph(row) {
    const ctx = document.createElement("canvas");
    const graphContainer = document.getElementById("graph-container");
    graphContainer.innerHTML = "";
    graphContainer.appendChild(ctx);

    const scoreMapping = {
        "매우 적극적": 5, "적극적": 4, "보통": 3, "소극적": 2, "참여 없음": 1,
        "100%-80%": 5, "80%-60%": 4, "60%-40%": 3, "40%-20%": 2, "20%-0%": 1,
        "매우 원활": 5, "원활": 4, "보통": 3, "미흡": 2, "협력 없음": 1,
        "매우 주도적": 5, "주도적": 4, "보통": 3, "수동적": 2, "의존적": 1
    };

    const scores = [
        scoreMapping[row[9].trim()] || 0,
        scoreMapping[row[10].trim()] || 0,
        scoreMapping[row[11].trim()] || 0,
        scoreMapping[row[12].trim()] || 0
    ];

    new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["참여도", "성취도", "협력과 소통", "자기 주도성"],
            datasets: [{
                data: scores,
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 2,
                pointBackgroundColor: "rgba(54, 162, 235, 1)",
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 5,
                    ticks: {
                        stepSize: 1,
                        callback: value => value.toFixed(0)
                    },
                    pointLabels: {
                        font: { size: 14 }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            },
            layout: { padding: 10 }
        }
    });
}
