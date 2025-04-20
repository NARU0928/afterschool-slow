
// script.js - 막대그래프(bar chart) 기반 종합 평가 및 타이틀 삽입

// ... (기존 상단 생략)

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
