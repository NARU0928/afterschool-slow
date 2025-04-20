
// ✅ script.js 최종본: 회차 2x2 구조 복원 + 종합 날짜 비교 + 누락 차시 방지 + 그래프 중앙 정렬
// 전체 코드 통합
// 2025-04 기준 최신 기능 포함

// [1] 데이터 호출 및 초기화
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

    feedback.textContent = '';
    dataContainer.innerHTML = '';
    dataContainer.style.display = 'block';
    summaryContainer.style.display = 'none';
    programDropdown.innerHTML = '<option value="">프로그램명을 선택하세요</option>';
    dateDropdown.innerHTML = '<option value="">회차를 선택하세요</option>';
    summaryDropdown.innerHTML = '<option value="">활동 종합 기준을 선택하세요</option>';
    programDropdown.disabled = true;
    dateDropdown.disabled = true;
    summaryDropdown.disabled = true;

    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

    async function fetchData(range) {
        const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`
        );
        if (!res.ok) return null;
        return (await res.json()).values;
    }

    const [participantData, programContentData, summaryData] = await Promise.all([
        fetchData('참여자 평가'),
        fetchData('프로그램 내용'),
        fetchData('종합 평가')
    ]);

    if (!participantData || !programContentData || !summaryData) {
        feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        return;
    }

    const [, ...rows] = participantData;
    const [, ...programContentRows] = programContentData;
    const [, ...summaryRows] = summaryData;

    const filteredRows = rows.filter(row => row[8] === personalNumber);

    if (filteredRows.length === 0) {
        feedback.textContent = '일치하는 내용이 없습니다.';
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
        dataContainer.style.display = 'block';
        dataContainer.innerHTML = '';

        const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[4]))];
        dateDropdown.innerHTML = '<option value="">회차를 선택하세요</option>';
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateDropdown.appendChild(option);
        });
        dateDropdown.disabled = false;

        summaryDropdown.innerHTML = '<option value="">활동 종합 기준을 선택하세요</option>';
        const matchedSummary = summaryRows.filter(row => row[1] === selectedProgram);
        matchedSummary.forEach(row => {
            const option = document.createElement('option');
            option.value = row[3];
            option.dataset.start = row[4];
            option.dataset.end = row[5];
            option.dataset.program = row[1];
            option.dataset.teacher = row[2];
            option.dataset.name = row[6];
            option.dataset.pid = row[7];
            option.textContent = row[3];
            summaryDropdown.appendChild(option);
        });
        summaryDropdown.disabled = false;
    });

    dateDropdown.addEventListener('change', () => {
        const selectedProgram = programDropdown.value;
        const selectedDate = dateDropdown.value;
        const finalRows = filteredRows.filter(row => row[1] === selectedProgram && row[4] === selectedDate);

        summaryContainer.style.display = 'none';
        dataContainer.style.display = 'block';
        dataContainer.innerHTML = '';

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
                            .map(([category, items]) => `<p>[${category}]<br>${items.join('<br>')}</p>`)
                            .join('')}
                    </div>
                </div>
                <div class="grid-container">
                    <div class="grid-item left">
                        <div class="section-title">활동분석</div>
                        <div id="graph-container" style="width: 100%; height: 200px;"></div>
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

    summaryDropdown.addEventListener('change', () => {
        const selected = summaryDropdown.options[summaryDropdown.selectedIndex];
        const selectedProgram = selected.dataset.program;

        const toDate = (str) => {
            const [m, d] = str.split('/');
            return new Date(`2025-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        };
        const start = toDate(selected.dataset.start);
        const end = toDate(selected.dataset.end);

        const programRows = filteredRows.filter(row => {
            const current = toDate(row[3]);
            return row[1] === selectedProgram && current >= start && current <= end;
        });

        if (!programRows.length) {
            summaryContainer.style.display = 'none';
            return;
        }

        summaryInfo.innerHTML = `
            <div class="section-title">활동 종합 기준</div>
            <div style="padding: 15px 10px;">
                <p><strong>• 프로그램명 :</strong> ${selected.dataset.program}</p>
                <p><strong>• 강사명 :</strong> ${selected.dataset.teacher}</p>
                <p><strong>• 종합기준 :</strong> ${selected.value}</p>
                <p><strong>• 시작일 :</strong> ${selected.dataset.start}</p>
                <p><strong>• 종료일 :</strong> ${selected.dataset.end}</p>
                <p><strong>• 참여학생(회원번호) :</strong> ${selected.dataset.name} (${selected.dataset.pid})</p>
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

        const datasets = categories.map((label, i) => ({
            label,
            data: programRows.map(row => scoreMapping[row[categoryIndices[i]]?.trim()] || 0),
            backgroundColor: `hsl(${i * 90}, 70%, 70%)`
        }));

        lineChartContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        lineChartContainer.appendChild(canvas);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { stacked: false },
                    y: {
                        min: 0,
                        max: 5,
                        ticks: { stepSize: 1 },
                        stacked: false
                    }
                }
            }
        });

        const summaryRow = summaryRows.find(row =>
            row[1] === selectedProgram && row[7] === filteredRows[0][8]
        );
        summaryActivity.innerHTML = summaryRow ? `<p>${summaryRow[8]}</p>` : '내용 없음';
        summaryHomeMessage.innerHTML = summaryRow ? `<p>${summaryRow[9]}</p>` : '내용 없음';

        summaryContainer.style.display = 'block';
        dataContainer.style.display = 'none';
    });
});

// 🔄 회차별 레이더 그래프
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
        scoreMapping[row[9]?.trim()] || 0,
        scoreMapping[row[10]?.trim()] || 0,
        scoreMapping[row[11]?.trim()] || 0,
        scoreMapping[row[12]?.trim()] || 0
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
