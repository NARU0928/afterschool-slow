document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value;
    const feedback = document.getElementById('feedback');
    const dataContainer = document.getElementById('data-container');
    const programDropdown = document.getElementById('program-dropdown');
    const dateDropdown = document.getElementById('date-dropdown');

    feedback.textContent = ''; // 안내 문구 초기화
    dataContainer.innerHTML = ''; // 기존 데이터 초기화
    programDropdown.disabled = true; // 드롭다운 비활성화
    dateDropdown.disabled = true;

    const apiKey = 'AIzaSyCxuIls44oOUftmwLSfTTz88oiskpr4OPY'; // 실제 API Key 입력
    const spreadsheetId = '1iQQ_1rn0v2UG5RAVdrHxHRiTKbBZvStVj7PT3cHrnoA'; // 실제 Spreadsheet ID 입력
    const participantRange = '참여자 평가!A1:Z100'; // 메인 시트 범위

    try {
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${participantRange}?key=${apiKey}`
        );
        const data = await response.json();

        if (data.values) {
            const [headers, ...rows] = data.values;

            // 개인번호 필터링
            const filteredRows = rows.filter(row => row[7] === personalNumber); // 개인번호가 7번째 열

            if (filteredRows.length > 0) {
                feedback.textContent = ''; // 안내 문구 비우기

                // 드롭다운 채우기
                const programs = [...new Set(filteredRows.map(row => row[1]))];
                programDropdown.innerHTML = `<option value="">프로그램명을 선택하세요</option>`;
                programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programDropdown.appendChild(option);
                });
                programDropdown.disabled = false;

                programDropdown.addEventListener('change', () => {
                    const selectedProgram = programDropdown.value;

                    // 날짜 드롭다운 채우기
                    const dates = [...new Set(filteredRows.filter(row => row[1] === selectedProgram).map(row => row[3]))];
                    dateDropdown.innerHTML = `<option value="">날짜를 선택하세요</option>`;
                    dates.forEach(date => {
                        const option = document.createElement('option');
                        option.value = date;
                        option.textContent = date;
                        dateDropdown.appendChild(option);
                    });
                    dateDropdown.disabled = false;
                });
            } else {
                feedback.textContent = '일치하는 내용이 없습니다. 회원번호를 다시 한 번 확인해주세요.';
            }
        } else {
            feedback.textContent = '데이터를 불러오는 데 실패했습니다.';
        }
    } catch (error) {
        feedback.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
        console.error('Error:', error);
    }
});
