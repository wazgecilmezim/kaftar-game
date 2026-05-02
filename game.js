(function(){
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;

    function calcSizes() {
        const appEl = document.getElementById('app');
        const appH = appEl.clientHeight;
        const appW = appEl.clientWidth;
        const sideW = 80; 
        const maxBoardW = Math.min(appW - sideW - 24, 300);
        let bSize = Math.floor(maxBoardW / BOARD_WIDTH);
        const headerH = 40;
        const statusH = 20;
        const ctrlH = Math.min(Math.floor((appW - 24) / 5), 56);
        const footerH = 16;
        const gaps = 12 * 4;
        const availH = appH - headerH - statusH - ctrlH - footerH - gaps;
        const maxBSize = Math.floor(availH / BOARD_HEIGHT);
        bSize = Math.min(bSize, maxBSize, 28);
        bSize = Math.max(bSize, 18);
        return bSize;
    }

    let blockSize = calcSizes();
    const boardCanvas = document.getElementById('boardCanvas');
    const boardCtx = boardCanvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');

    function resizeCanvas() {
        blockSize = calcSizes();
        boardCanvas.width = BOARD_WIDTH * blockSize;
        boardCanvas.height = BOARD_HEIGHT * blockSize;
    }
    resizeCanvas();
    window.addEventListener('resize', () => { resizeCanvas(); drawAll(); });

    let board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    let score = 0;
    let totalLines = 0;
    let level = 1;
    let activePiece = null;
    let nextTetromino = null;
    let gameLoopInterval = null;
    let isGameOver = false;

    const TETROMINOS = [
        { shape: [[1,1,1,1]],           color: '#00e5ff' },
        { shape: [[1,1],[1,1]],         color: '#ffe800' },
        { shape: [[0,1,0],[1,1,1]],     color: '#cc44ff' },
        { shape: [[0,1,1],[1,1,0]],     color: '#00e676' },
        { shape: [[1,1,0],[0,1,1]],     color: '#ff4444' },
        { shape: [[1,0,0],[1,1,1]],     color: '#ff8c00' },
        { shape: [[0,0,1],[1,1,1]],     color: '#448aff' }
    ];

    function randomTetro() {
        const t = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
        return {
            shape: t.shape.map(r => [...r]),
            color: t.color,
            x: Math.floor((BOARD_WIDTH - t.shape[0].length) / 2),
            y: 0
        };
    }

    function collision(shape, ox, oy) {
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++)
                if (shape[r][c]) {
                    const bx = ox + c, by = oy + r;
                    if (bx < 0 || bx >= BOARD_WIDTH || by >= BOARD_HEIGHT) return true;
                    if (by >= 0 && board[by][bx]) return true;
                }
        return false;
    }

    function movePiece(dx, dy) {
        if (!activePiece || isGameOver) return false;
        if (!collision(activePiece.shape, activePiece.x + dx, activePiece.y + dy)) {
            activePiece.x += dx;
            activePiece.y += dy;
            drawAll();
            return true;
        } else if (dy === 1) {
            mergePiece();
        }
        return false;
    }

    function rotatePiece() {
        if (!activePiece || isGameOver) return;
        const rot = activePiece.shape[0].map((_, i) =>
            activePiece.shape.map(row => row[i]).reverse()
        );
        if (!collision(rot, activePiece.x, activePiece.y)) {
            activePiece.shape = rot;
        }
        drawAll();
    }

    function mergePiece() {
        for (let r = 0; r < activePiece.shape.length; r++)
            for (let c = 0; c < activePiece.shape[r].length; c++)
                if (activePiece.shape[r][c]) {
                    const by = activePiece.y + r;
                    if (by < 0) { isGameOver = true; break; }
                    board[by][activePiece.x + c] = activePiece.color;
                }
        clearLines();
        spawnPiece();
    }

    function clearLines() {
        let lines = 0;
        for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== 0)) {
                board.splice(r, 1);
                board.unshift(Array(BOARD_WIDTH).fill(0));
                lines++;
                r++;
            }
        }
        if (lines > 0) {
            score += lines * 100 * level;
            totalLines += lines;
            level = Math.floor(totalLines / 10) + 1;
            updateScore();
        }
    }

    function updateScore() {
        document.getElementById('scoreDisplay').textContent = score;
        document.getElementById('levelDisplay').textContent = level;
        document.getElementById('linesDisplay').textContent = totalLines;
    }

    function spawnPiece() {
        if (!nextTetromino) nextTetromino = randomTetro();
        activePiece = nextTetromino;
        nextTetromino = randomTetro();
        if (collision(activePiece.shape, activePiece.x, activePiece.y)) {
            isGameOver = true;
            document.getElementById('gameStatusText').textContent = 'OYUN BİTTİ';
        }
    }

    function drawBoard() {
        boardCtx.fillStyle = '#050a14';
        boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
        board.forEach((row, y) => {
            row.forEach((color, x) => {
                if (color) {
                    boardCtx.fillStyle = color;
                    boardCtx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
                }
            });
        });
        if (activePiece) {
            boardCtx.fillStyle = activePiece.color;
            activePiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        boardCtx.fillRect((activePiece.x + x) * blockSize, (activePiece.y + y) * blockSize, blockSize - 1, blockSize - 1);
                    }
                });
            });
        }
    }

    function drawNext() {
        nextCtx.fillStyle = '#081226';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextTetromino) {
            nextCtx.fillStyle = nextTetromino.color;
            nextTetromino.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        nextCtx.fillRect(x * 12 + 10, y * 12 + 10, 11, 11);
                    }
                });
            });
        }
    }

    function drawAll() { drawBoard(); drawNext(); }

    function gameTick() {
        if (!isGameOver) {
            movePiece(0, 1);
            drawAll();
        }
    }

    function restartGame() {
        board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
        score = 0; level = 1; totalLines = 0; isGameOver = false;
        document.getElementById('gameStatusText').textContent = '▶ OYNANIYOR';
        updateScore();
        spawnPiece();
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(gameTick, 500);
        drawAll();
    }

    document.getElementById('moveLeft').onclick = () => movePiece(-1, 0);
    document.getElementById('moveRight').onclick = () => movePiece(1, 0);
    document.getElementById('rotateBtn').onclick = () => rotatePiece();
    document.getElementById('hardDropBtn').onclick = () => { while(movePiece(0,1)); };
    document.getElementById('restartBtn').onclick = () => restartGame();

    restartGame();
})();
