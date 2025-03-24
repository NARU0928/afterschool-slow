document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value.trim();
    const feedback = document.getElementById('feedback');
    const programDropdown = document.getElementById('program-dropdown');
    const dateDropdown = document.getElementById('date-dropdown');
    const dataContainer = document.getElementById('data-container');

    feedback.textContent = '';
    dataContainer.innerHTML = '';
    programDropdown.innerHTML = `<option value="">프로그램명을 선택하세요</option>`;
    dateDropdown.innerHTML = `<option value="">날짜를 선택하세요</option>`;
    programDropdown.disabled = true;
    dateDropdown.disabled = true;

    // Netlify 환경 변수에서 API Key와 Spreadsheet ID를 가져옴
const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;


    console.log('API Key:', apiKey);
    console.log('Spreadsheet ID:', spreadsheetId);

    const participantRange = '참여자 평가!A1:Z100';
    const programContentRange = '프로그램 내용!A1:Z100';

    // Fetch 데이터 함수
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

    // 데이터 가져오기
    const participantData = await fetchData(participantRange);
    const programContentData = await fetchData(programContentRange);

    if (!participantData || !participantData.values || !programContentData || !programContentData.values) {
        feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        return;
    }

    console.log('참여자 평가 데이터:', participantData.values);
    console.log('프로그램 내용 데이터:', programContentData.values);

    const [headers, ...rows] = participantData.values;
    const [, ...programContentRows] = programContentData.values;

    // 회원번호로 필터링
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
            dateDropdown.innerHTML = `<option value="">날짜를 선택하세요</option>`;
            const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[4]))];
            dates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateDropdown.appendChild(option);
            });
            dateDropdown.disabled = false;
        });

        dateDropdown.addEventListener('change', () => {
            const selectedProgram = programDropdown.value;
            const selectedDate = dateDropdown.value;
            const finalRows = filteredRows.filter(row => row[1] === selectedProgram && row[4] === selectedDate);

            dataContainer.innerHTML = '';

            finalRows.forEach(row => {
                console.log('Row Data:', row);
                const programContent = programContentRows.filter(
                    contentRow => contentRow[1] === row[1] && contentRow[4] === row[4]
                );

                // 활동 내용과 평가 출력
                const groupedContent = programContent.reduce((acc, content) => {
                    const category = content[6];
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(`- ${content[7]}`);
                    return acc;
                }, {});

               const participationInfo = `
    <div class="section-title">참여정보</div>
    <div style="margin-bottom: 20px;">
        <p><strong>• 프로그램명 :</strong> ${row[1]}</p>
        <p><strong>• 강사명 :</strong> ${row[2]}</p>
        <p><strong>• 수업일자 :</strong> ${row[3]}</p>
        <p><strong>• 수업목표 :</strong> ${row[6]}</p>
        <p><strong>• 참여학생(회원번호) :</strong> ${row[7]} (${row[8]})</p>
    </div>
`;

const activityContent = `
    <div class="section-title">활동내용</div>
    <div style="margin-bottom: 20px;">
        ${Object.entries(groupedContent)
            .map(([category, activities]) => `<p>[${category}]<br>${activities.join('<br>')}</p>`)
            .join('')}
    </div>
`;

const activityEvaluation = `
    <div class="section-title">활동평가</div>
    <div style="width: 48%; display: inline-block; vertical-align: top;">
        <div id="graph-container" style="width: 100%; height: 200px; margin-bottom: 10px;"></div>
        <p style="display: flex; gap: 10px; flex-wrap: wrap;">
            <span>• 참여도 : ${row[9]}</span>
            <span>• 성취도 : ${row[10]}</span>
            <span>• 협력과 소통 : ${row[11]}</span>
            <span>• 자기 주도성 : ${row[12]}</span>
        </p>
    </div>
`;

const singleLineEvaluation = `
    <div class="section-title">한줄평가</div>
    <div class="one-line-review">${row[13]}</div>
`;


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
            <div class="section-title">활동평가</div>
            <div id="graph-container" style="width: 100%; height: 200px; margin-bottom: 10px;"></div>
            <p style="display: flex; gap: 10px; flex-wrap: wrap;">
                <span>• 참여도 : ${row[9]}</span>
                <span>• 성취도 : ${row[10]}</span>
                <span>• 협력과 소통 : ${row[11]}</span>
                <span>• 자기 주도성 : ${row[12]}</span>
            </p>
        </div>
        <div class="grid-item right">
            <div class="section-title">한줄평가</div>
            <div class="one-line-review">${row[13]}</div>
        </div>
    </div>
`;


                renderGraph(row);
            });
        });
    } else {
        feedback.textContent = '일치하는 내용이 없습니다.';
    }
});

// 그래프 생성 함수
function renderGraph(row) {
    const ctx = document.createElement("canvas");
    const graphContainer = document.getElementById("graph-container");
    graphContainer.innerHTML = "";
    graphContainer.appendChild(ctx);

    // 점수 변환을 위한 매핑 (문자 → 숫자 변환)
    const scoreMapping = {
        "매우 적극적": 5, "적극적": 4, "보통": 3, "소극적": 2, "참여 없음": 1,
        "100%-80%": 5, "80%-60%": 4, "60%-40%": 3, "40%-20%": 2, "20%-0%": 1,
        "매우 원활": 5, "원활": 4, "보통": 3, "미흡": 2, "협력 없음": 1,
        "매우 주도적": 5, "주도적": 4, "보통": 3, "수동적": 2, "의존적": 1
    };

    // 평가 점수 가져오기 (문자 -> 숫자로 변환)
    const scores = [
        scoreMapping[row[9].trim()] || 0,
        scoreMapping[row[10].trim()] || 0,
        scoreMapping[row[11].trim()] || 0,
        scoreMapping[row[12].trim()] || 0
    ];

    console.log("Converted Scores:", scores); // 디버깅용

    // Chart.js를 활용한 그래프 생성
    new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["참여도", "성취도", "협력과 소통", "자기 주도성"],
            datasets: [
                {
                    label: "", // 범례 제거
                    data: scores,
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 2,
                    pointBackgroundColor: "rgba(54, 162, 235, 1)",
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 5, // 5점 만점으로 설정
                    ticks: {
                        stepSize: 1, // 1단위로 표시
                        callback: function(value) {
                            return value.toFixed(0); // 소수점 제거
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // 범례 제거
                }
            }
        }
    });
}
