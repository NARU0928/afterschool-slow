document.getElementById('fetch-data').addEventListener('click', async () => {
    const personalNumber = document.getElementById('personal-number').value;
    const apiKey = 'YOUR_GOOGLE_SHEETS_API_KEY'; // API Key 설정
    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Spreadsheet ID 설정



    // 각 시트의 범위 지정
    const participantRange = '참여자 평가!A1:Z100'; // 메인 시트

    try {
        // '참여자 평가' 시트 데이터 가져오기
        const participantResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${participantRange}?key=${apiKey}`
        );
        const participantData = await participantResponse.json();

        console.log('Participant Data:', participantData); // 가져온 데이터 확인

        const container = document.getElementById('data-container');
        container.innerHTML = ''; // 기존 데이터를 초기화

        if (participantData.values) {
            // 헤더와 데이터 분리
            const [headers, ...rows] = participantData.values;

            console.log('Headers:', headers); // 헤더 확인
            console.log('Rows:', rows);       // 모든 데이터 행 확인

            // 개인번호 기준으로 데이터 필터링
            const filteredRows = rows.filter(row => row[7] === personalNumber); // 개인번호가 7번째 열

            console.log('Filtered Rows:', filteredRows); // 필터링된 데이터 확인

            if (filteredRows.length > 0) {
                filteredRows.forEach(row => {
                    const div = document.createElement('div');
                    div.textContent = headers.map((header, i) => `${header}: ${row[i]}`).join(', ');
                    container.appendChild(div);
                });
            } else {
                container.textContent = 'No matching data found.';
            }
        } else {
            container.textContent = 'No data found.';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('data-container').textContent = 'Error fetching data.';
    }
});
