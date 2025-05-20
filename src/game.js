// カードのペア定義
// key: value がペアになる。13はペアにならない特別なカード。
const PAIRS = {
    1: 2, 2: 1,
    3: 4, 4: 3,
    5: 6, 6: 5,
    7: 8, 8: 7,
    9: 10, 10: 9,
    11: 12, 12: 11
};

// ゲームの設定
const GAME_CONFIG = {
    CARD_WIDTH: 100, // カードの幅
    CARD_HEIGHT: 140, // カードの高さ
    BOARD_COLS: 3, // ボードの列数
    BOARD_ROWS: 3, // ボードの行数
    BOARD_PADDING: 20, // ボード全体のパディング
    DECK_X: 150, // デッキのX座標
    DECK_Y: 550, // デッキのY座標
    MESSAGE_X: 400, // メッセージ表示のX座標
    MESSAGE_Y: 50 // メッセージ表示のY座標
};

// Phaserゲームの設定
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 700,
    scene: [BootScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#4488aa'
};

// ゲームインスタンスの作成
const game = new Phaser.Game(config);

// --- BootScene (アセットの読み込みとテクスチャ生成) ---
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // ロード画面表示（テクスチャ生成中のメッセージ）
        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Generating cards...', {
            font: '30px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5, 0.5);
    }

    create() {
        // カードのテクスチャを動的に生成
        this.createCardTextures();
        this.scene.start('GameScene');
    }

    /**
     * カードのテクスチャを動的に生成し、テクスチャマネージャーに追加する
     */
    createCardTextures() {
        const CARD_WIDTH = GAME_CONFIG.CARD_WIDTH;
        const CARD_HEIGHT = GAME_CONFIG.CARD_HEIGHT;
        const cornerRadius = 10; // カードの角丸の半径

        // カードの裏面 (card_back) を生成
        const backGraphics = this.add.graphics();
        backGraphics.fillStyle(0x000088, 1); // 濃い青色
        backGraphics.fillRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, cornerRadius);
        backGraphics.lineStyle(3, 0xffffff, 1); // 白い枠線
        backGraphics.strokeRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, cornerRadius);
        backGraphics.fillStyle(0x0000aa, 1); // 中央にデザイン
        backGraphics.fillCircle(CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_WIDTH * 0.2);
        backGraphics.lineStyle(2, 0xaaaaaa, 1);
        backGraphics.strokeCircle(CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_WIDTH * 0.3);

        backGraphics.generateTexture('card_back', CARD_WIDTH, CARD_HEIGHT);
        backGraphics.destroy(); // Graphicsオブジェクトはもう不要なので破棄

        // 1から13までのカード表面を生成
        for (let i = 1; i <= 13; i++) {
            // Graphicsでカードのベースを描画
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff, 1); // 白い背景
            graphics.fillRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, cornerRadius);
            graphics.lineStyle(3, 0x000000, 1); // 黒い枠線
            graphics.strokeRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, cornerRadius);

            // カードの数字を表示
            // PhaserのテキストはHTML CanvasのdrawTextを使用するため、フォントが利用可能か注意
            const color = (i % 2 === 0) ? '#ff0000' : '#0000ff'; // 偶数は赤、奇数は青の例 (13は例外的に黒)
            const textColor = (i === 13) ? '#000000' : color; // 13は黒に

            const numberText = this.add.text(CARD_WIDTH / 2, CARD_HEIGHT / 2, String(i), {
                fontSize: '48px',
                fontFamily: 'Arial', // フォントを指定
                color: textColor,
                stroke: '#000000', // 縁取り
                strokeThickness: 3
            }).setOrigin(0.5);

            // Render Textureを作成し、GraphicsとTextを描画してテクスチャ化
            const renderTexture = this.add.renderTexture(0, 0, CARD_WIDTH, CARD_HEIGHT);
            renderTexture.draw(graphics); // Graphicsを描画
            // drawTextのx, yはrenderTexture内の相対座標
            renderTexture.draw(numberText, numberText.x, numberText.y); 

            renderTexture.saveTexture(`card_${i}`); // 指定したキーでテクスチャとして保存
            
            // 使用したオブジェクトを破棄
            renderTexture.destroy(); 
            graphics.destroy(); 
            numberText.destroy(); 
        }
    }
}

// --- GameScene (ゲーム本体) ---
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.deck = []; // デッキのカード
        this.board = []; // ゲームボード (3x3のグリッド)
        this.currentCard = null; // 現在配置するカード
        this.cardsOnBoard = []; // ボード上のカードオブジェクト (Phaser.GameObjects.Image)
        this.deckCountText = null; // デッキ残り枚数表示
        this.messageText = null; // メッセージ表示
        this.gameStarted = false; // ゲーム開始フラグ
    }

    create() {
        this.gameStarted = false;
        this.initializeBoard();
        this.createDeck();
        this.setupUI();
        this.dealNextCard();

        this.messageText.setText('クリックしてゲーム開始');
        this.input.once('pointerdown', () => {
            this.messageText.setText('');
            this.gameStarted = true;
            this.updateDeckCount();
        });
    }

    initializeBoard() {
        // 3x3のボードを初期化
        for (let r = 0; r < GAME_CONFIG.BOARD_ROWS; r++) {
            this.board[r] = [];
            for (let c = 0; c < GAME_CONFIG.BOARD_COLS; c++) {
                this.board[r][c] = null; // nullはカードがないことを示す (カードの絵柄の数値が入る)
            }
        }

        // ボードのグリッド表示とドロップゾーンの設定
        const startX = (this.sys.game.config.width - (GAME_CONFIG.BOARD_COLS * GAME_CONFIG.CARD_WIDTH + (GAME_CONFIG.BOARD_COLS - 1) * GAME_CONFIG.BOARD_PADDING)) / 2;
        const startY = (this.sys.game.config.height / 2) - (GAME_CONFIG.BOARD_ROWS * GAME_CONFIG.CARD_HEIGHT + (GAME_CONFIG.BOARD_ROWS - 1) * GAME_CONFIG.BOARD_PADDING) / 2 + 50; // 中央より少し上に調整

        for (let r = 0; r < GAME_CONFIG.BOARD_ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.BOARD_COLS; c++) {
                const x = startX + c * (GAME_CONFIG.CARD_WIDTH + GAME_CONFIG.BOARD_PADDING) + GAME_CONFIG.CARD_WIDTH / 2;
                const y = startY + r * (GAME_CONFIG.CARD_HEIGHT + GAME_CONFIG.BOARD_PADDING) + GAME_CONFIG.CARD_HEIGHT / 2;

                // ドロップゾーンを作成
                const dropArea = this.add.zone(x, y, GAME_CONFIG.CARD_WIDTH, GAME_CONFIG.CARD_HEIGHT).setRectangleDropZone(GAME_CONFIG.CARD_WIDTH, GAME_CONFIG.CARD_HEIGHT);
                dropArea.setData({ row: r, col: c }); // ドロップゾーンにグリッドの座標を紐付け

                // ドロップエリアの枠線表示（デバッグ用・視覚的に分かりやすくするため）
                const graphics = this.add.graphics();
                graphics.lineStyle(2, 0xcccccc);
                graphics.strokeRect(dropArea.x - dropArea.input.hitArea.width / 2, dropArea.y - dropArea.input.hitArea.height / 2, dropArea.input.hitArea.width, dropArea.input.hitArea.height);

                this.cardsOnBoard.push(null); // ボード上のカードオブジェクトの参照管理用
            }
        }
    }

    createDeck() {
        // 13種類の絵柄のカードを4枚ずつ作成
        for (let i = 1; i <= 13; i++) {
            for (let j = 0; j < 4; j++) {
                this.deck.push(i); // カードの絵柄（数字）を配列に追加
            }
        }
        // デッキをシャッフル
        Phaser.Utils.Array.Shuffle(this.deck);
    }

    setupUI() {
        // デッキの残り枚数表示
        // 'card_back' テクスチャを使用
        this.add.image(GAME_CONFIG.DECK_X, GAME_CONFIG.DECK_Y, 'card_back').setScale(0.8);
        this.deckCountText = this.add.text(GAME_CONFIG.DECK_X, GAME_CONFIG.DECK_Y + 70, `残り: ${this.deck.length}`, {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5);

        // メッセージ表示
        this.messageText = this.add.text(GAME_CONFIG.MESSAGE_X, GAME_CONFIG.MESSAGE_Y, '', {
            fontSize: '32px',
            fill: '#ff0', // 黄色
            stroke: '#000', // 黒い縁取り
            strokeThickness: 4
        }).setOrigin(0.5);

        // ボード上のドロップイベントをセットアップ
        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.gameStarted) return; // ゲーム開始前はドロップ無効

            const row = dropZone.getData('row');
            const col = dropZone.getData('col');

            // 既にカードが置かれている場合は何もしない
            if (this.board[row][col] !== null) {
                this.messageText.setText('そこには置けません');
                // ドロップ失敗したカードを元の位置に戻すアニメーション
                this.tweens.add({
                    targets: gameObject,
                    x: this.currentCard.originalX,
                    y: this.currentCard.originalY,
                    duration: 200,
                    ease: 'Power1'
                });
                return;
            }

            // カードをボードに配置
            gameObject.x = dropZone.x;
            gameObject.y = dropZone.y;
            gameObject.disableInteractive(); // 配置されたカードは動かせないようにする
            this.board[row][col] = gameObject.cardValue; // ボードの状態を更新 (カードの絵柄の数値)

            // カードオブジェクトをボード管理用配列に格納
            const index = row * GAME_CONFIG.BOARD_COLS + col;
            this.cardsOnBoard[index] = gameObject;

            this.messageText.setText(''); // メッセージをクリア

            // ペアチェックと消滅処理
            this.checkAndClearPairs(row, col);

            // 次のカードを配る (0.5秒後に実行)
            this.time.delayedCall(500, this.dealNextCard, [], this); 
        });

        // ドラッグ開始時の処理
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.gameStarted) return;
            this.children.bringToTop(gameObject); // ドラッグ中のカードを手前に表示
        });

        // ドラッグ中の処理
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.gameStarted) return;
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        // ドラッグ終了時の処理（ドロップゾーン以外にドロップされた場合、元の位置に戻す）
        this.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!this.gameStarted) return;
            if (!dropped) {
                this.tweens.add({
                    targets: gameObject,
                    x: gameObject.originalX,
                    y: gameObject.originalY,
                    duration: 200,
                    ease: 'Power1'
                });
            }
        });
    }

    dealNextCard() {
        // 現在のカードがあれば破棄（前のカードがボードに置かれずに残っている場合など）
        if (this.currentCard) {
            this.currentCard.destroy();
            this.currentCard = null;
        }

        // デッキにカードが残っているかチェック
        if (this.deck.length > 0) {
            const cardValue = this.deck.pop(); // デッキから1枚引く
            this.updateDeckCount();

            // 現在のカードを生成し、インタラクティブにする
            // 'card_' + cardValue のテクスチャを使用
            this.currentCard = this.add.image(GAME_CONFIG.DECK_X, GAME_CONFIG.DECK_Y, `card_${cardValue}`)
                .setInteractive({ draggable: true });
            this.currentCard.cardValue = cardValue; // カードの絵柄をプロパティとして保持
            this.currentCard.originalX = GAME_CONFIG.DECK_X;
            this.currentCard.originalY = GAME_CONFIG.DECK_Y;

        } else {
            // デッキが空になったらゲームクリアの判定
            this.checkGameEnd();
        }
    }

    updateDeckCount() {
        this.deckCountText.setText(`残り: ${this.deck.length}`);
    }

    checkAndClearPairs(row, col) {
        const placedCardValue = this.board[row][col];
        if (placedCardValue === null) return; // カードが既に消滅している場合はスキップ

        // ペアにならない特別なカード (13) は、隣接しても消滅しない
        if (placedCardValue === 13) {
            return;
        }

        const neighbors = [
            { r: row - 1, c: col }, // 上
            { r: row + 1, c: col }, // 下
            { r: row, c: col - 1 }, // 左
            { r: row, c: col + 1 }  // 右
        ];

        let cardsToClear = []; // 消滅させるカードのリスト（{r, c, cardValue}）
        let foundPair = false;

        // 隣接するカードをチェック
        neighbors.forEach(neighbor => {
            const nr = neighbor.r;
            const nc = neighbor.c;

            // ボードの範囲内かつカードがあるかチェック
            if (nr >= 0 && nr < GAME_CONFIG.BOARD_ROWS && nc >= 0 && nc < GAME_CONFIG.BOARD_COLS && this.board[nr][nc] !== null) {
                const neighborCardValue = this.board[nr][nc];

                // ペアかどうかをチェック
                if (PAIRS[placedCardValue] === neighborCardValue) {
                    foundPair = true;
                    // ペアが見つかった場合、配置したカードと隣接カードの両方を消滅リストに追加
                    cardsToClear.push({ r: row, c: col, cardValue: placedCardValue });
                    cardsToClear.push({ r: nr, c: nc, cardValue: neighborCardValue });
                }
            }
        });

        // 重複するカードがある場合があるので、Setを使って一意にする
        const uniqueCardsToClear = [];
        const seen = new Set(); // 既に処理したカードの座標を記録

        if (foundPair) {
            this.messageText.setText('ペア成立！');

            // 消滅対象のカードをボードから物理的に削除し、アニメーション
            // uniqueCardsToClear を構築しながら処理
            cardsToClear.forEach(cardData => {
                const key = `${cardData.r},${cardData.c}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCardsToClear.push(cardData); // リストに追加

                    const index = cardData.r * GAME_CONFIG.BOARD_COLS + cardData.c;
                    const cardObject = this.cardsOnBoard[index];

                    if (cardObject) {
                        // フェードアウトと縮小のアニメーション
                        this.tweens.add({
                            targets: cardObject,
                            alpha: 0,
                            scale: 0.5,
                            duration: 300,
                            ease: 'Power2',
                            onComplete: () => {
                                cardObject.destroy(); // アニメーション終了後にオブジェクトを破棄
                                this.board[cardData.r][cardData.c] = null; // ボードの内部状態を更新
                                this.cardsOnBoard[index] = null; // 参照もクリア
                            }
                        });
                    }
                }
            });
        }
    }

    checkGameEnd() {
        if (this.deck.length === 0) {
            // デッキが空になった場合
            let remainingCards = 0;
            for (let r = 0; r < GAME_CONFIG.BOARD_ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.BOARD_COLS; c++) {
                    if (this.board[r][c] !== null) {
                        remainingCards++;
                    }
                }
            }

            if (remainingCards === 0) {
                this.messageText.setText('ゲームクリア！パーフェクト！');
            } else {
                this.messageText.setText('ゲームクリア！');
            }

            // 3秒後にゲームを再開
            this.time.delayedCall(3000, () => {
                this.scene.restart(); 
            }, [], this);
        }
    }
}