# html_test
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>算数タイムアタックゲーム</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
        }
        .question {
            font-size: 24px;
            margin: 20px 0;
        }
        input[type="text"] {
            padding: 5px;
            font-size: 18px;
            width: 60px;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
        }
        .result {
            font-size: 20px;
            margin-top: 20px;
        }
        .timer {
            font-size: 30px;
            color: red;
            margin-bottom: 20px;
        }
        .score {
            font-size: 20px;
            margin-top: 20px;
        }
        #retryButton {
            display: none;
            margin-top: 20px;
        }
        #hint {
            font-size: 18px;
            margin-top: 20px;
            color: #FF6347;
        }
        .ranking {
            margin-top: 30px;
        }
        .ranking h2 {
            font-size: 24px;
        }
        .ranking ol {
            text-align: left;
            list-style-type: decimal;
            padding-left: 20px;
        }
        #adminButton {
            margin-top: 20px;
            padding: 10px;
            background-color: #f44336;
            color: white;
            display: none;
        }
        #adminPanel {
            display: none;
            margin-top: 30px;
        }
        .admin-section {
            margin-top: 20px;
        }
    </style>
</head>
<body>

    <h1>算数タイムアタックゲーム</h1>
    <p>制限時間内にできるだけ多くの問題を解こう！</p>

    <div>
        <label for="gameTime">ゲームの時間（秒）:</label>
        <input type="number" id="gameTime" min="10" max="300" value="30">
        <button id="startButton" onclick="startGame()">スタート</button>
    </div>

    <div id="timer" class="timer">30</div>

    <div id="problem" class="question">スタートボタンを押してゲームを開始してください。</div>

    <input type="text" id="answer" placeholder="答えを入力" disabled/>

    <div id="hint" class="hint">ヒントがここに表示されます。</div>

    <button id="retryButton" onclick="startGame()">リトライ</button>

    <div id="result" class="result"></div>
    <div id="score" class="score">得点: 0</div>

    <div class="ranking">
        <h2>ランキング</h2>
        <ol id="rankingList"></ol>
    </div>

    <div id="adminAccess">
        <input type="password" id="adminPassword" placeholder="管理者パスワード">
        <button onclick="checkAdminPassword()">管理者ログイン</button>
    </div>

    <button id="adminButton" onclick="toggleAdminPanel()">管理者パネル</button>

    <div id="adminPanel">
        <h2>管理者用パネル</h2>
        <button onclick="resetRanking()">ランキングをリセット</button>

        <div class="admin-section">
            <h3>特定プレイヤーのスコアをリセット</h3>
            <label for="resetName">名前:</label>
            <input type="text" id="resetName" placeholder="名前を入力">
            <button onclick="resetPlayerScore()">スコアをリセット</button>
        </div>
    </div>

    <script>
        let num1, num2, correctAnswer, operator;
        let score = 0;
        let timeLeft = 30;
        let timerInterval;
        let gameOver = false;

        function loadRanking() {
            const ranking = JSON.parse(localStorage.getItem('ranking')) || [];
            ranking.sort((a, b) => b.score - a.score);
            const rankingList = document.getElementById("rankingList");
            rankingList.innerHTML = "";
            ranking.slice(0, 10).forEach((entry, index) => {
                const li = document.createElement("li");
                li.textContent = `第${index + 1}位: ${entry.name} - ${entry.score}点`;
                rankingList.appendChild(li);
            });
        }

        window.onload = loadRanking;

        function startGame() {
            const gameTimeInput = document.getElementById("gameTime");
            const inputTime = parseInt(gameTimeInput.value, 10);
            if (isNaN(inputTime) || inputTime < 10 || inputTime > 300) {
                alert("ゲームの時間を10秒以上300秒以下で設定してください。");
                return;
            }

            score = 0;
            timeLeft = inputTime;
            gameOver = false;
            document.getElementById("score").textContent = `得点: ${score}`;
            document.getElementById("answer").disabled = false;
            document.getElementById("startButton").style.display = "none";
            document.getElementById("retryButton").style.display = "none";
            document.getElementById("timer").textContent = timeLeft;
            document.getElementById("hint").textContent = "ヒントがここに表示されます。";
            generateProblem();
            timerInterval = setInterval(updateTimer, 1000);
        }

        function generateProblem() {
            const operators = ['+', '-', '*', '/'];
            operator = operators[Math.floor(Math.random() * operators.length)];

            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;

            if (operator === '+') {
                correctAnswer = num1 + num2;
                const hintType = Math.floor(Math.random() * 3);
                if (hintType === 0) {
                    document.getElementById("hint").textContent = `ヒント: 足し算です。${num1} と ${num2} を足してみてください。`;
                } else if (hintType === 1) {
                    document.getElementById("hint").textContent = `ヒント: 数字を順番に加えていく方法を使ってください。`;
                } else {
                    document.getElementById("hint").textContent = `ヒント: ${num1} に ${num2} を加えると答えが出ます。`;
                }
            } else if (operator === '-') {
                correctAnswer = num1 - num2;
                const hintType = Math.floor(Math.random() * 3);
                if (hintType === 0) {
                    document.getElementById("hint").textContent = `ヒント: 引き算です。${num1} から ${num2} を引いてみてください。`;
                } else if (hintType === 1) {
                    document.getElementById("hint").textContent = `ヒント: 差を求める問題です。`;
                } else {
                    document.getElementById("hint").textContent = `ヒント: 最初の数から後ろの数を引いてください。`;
                }
            } else if (operator === '*') {
                correctAnswer = num1 * num2;
                const hintType = Math.floor(Math.random() * 3);
                if (hintType === 0) {
                    document.getElementById("hint").textContent = `ヒント: 掛け算です。${num1} と ${num2} を掛けてみてください。`;
                } else if (hintType === 1) {
                    document.getElementById("hint").textContent = `ヒント: ${num1} を ${num2} 回足した結果が答えです。`;
                } else {
                    document.getElementById("hint").textContent = `ヒント: ${num1} と ${num2} を掛け算してみてください。`;
                }
            } else if (operator === '/') {
                if (num2 === 0) num2 = 1;
                correctAnswer = Math.floor(num1 / num2);
                const hintType = Math.floor(Math.random() * 2);
                if (hintType === 0) {
                    document.getElementById("hint").textContent = `ヒント: 割り算です。${num1} を ${num2} で割ってみてください。`;
                } else {
                    document.getElementById("hint").textContent = `ヒント: ${num1} を ${num2} 回分けると答えが得られます。`;
                }
            }

            document.getElementById("problem").textContent = `${num1} ${operator} ${num2} = ?`;
            document.getElementById("result").textContent = "";
        }

        function updateTimer() {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                gameOver = true;
                document.getElementById("timer").textContent = "時間終了！";
                document.getElementById("retryButton").style.display = "block";
                document.getElementById("answer").disabled = true;
                saveScore();
            } else {
                document.getElementById("timer").textContent = --timeLeft;
            }
        }

        function checkAnswer() {
            const answer = parseInt(document.getElementById("answer").value, 10);
            if (isNaN(answer)) return;

            if (answer === correctAnswer) {
                score++;
                document.getElementById("score").textContent = `得点: ${score}`;
                generateProblem();
            } else {
                document.getElementById("result").textContent = `不正解！ 正しい答えは ${correctAnswer} です。`;
            }

            document.getElementById("answer").value = '';
        }

        document.getElementById("answer").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                checkAnswer();
            }
        });

        function saveScore() {
            const playerName = prompt("名前を入力してください:");
            if (!playerName) return;

            const ranking = JSON.parse(localStorage.getItem('ranking')) || [];
            ranking.push({ name: playerName, score: score });
            localStorage.setItem('ranking', JSON.stringify(ranking));

            loadRanking();
        }

        function toggleAdminPanel() {
            const adminPanel = document.getElementById("adminPanel");
            adminPanel.style.display = adminPanel.style.display === "block" ? "none" : "block";
        }

        function checkAdminPassword() {
            const password = document.getElementById("adminPassword").value;
            if (password === "44146") {
                document.getElementById("adminButton").style.display = "block";
                document.getElementById("adminAccess").style.display = "none";
            } else {
                alert("パスワードが間違っています。");
            }
        }

        function resetRanking() {
            if (confirm("ランキングをリセットしますか？")) {
                localStorage.removeItem('ranking');
                loadRanking();
            }
        }

        function resetPlayerScore() {
            const playerName = document.getElementById("resetName").value.trim();
            if (playerName === "") {
                alert("名前を入力してください。");
                return;
            }

            let ranking = JSON.parse(localStorage.getItem('ranking')) || [];
            ranking = ranking.filter(entry => entry.name !== playerName);
            localStorage.setItem('ranking', JSON.stringify(ranking));
            loadRanking();
        }
    </script>
</body>
</html>
