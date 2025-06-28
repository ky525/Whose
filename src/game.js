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

// ペアごとの色とアルファベット定義
const PAIR_STYLES = {
    1: { color: 0xe74c3c, letter: 'A', textColor: '#ffffff' }, // 赤系
    2: { color: 0xc0392b, letter: 'A', textColor: '#f8f9fa' }, // 濃い赤系
    3: { color: 0x27ae60, letter: 'B', textColor: '#ffffff' }, // 緑系
    4: { color: 0x229954, letter: 'B', textColor: '#f8f9fa' }, // 濃い緑系
    5: { color: 0x3498db, letter: 'C', textColor: '#ffffff' }, // 青系
    6: { color: 0x2980b9, letter: 'C', textColor: '#f8f9fa' }, // 濃い青系
    7: { color: 0xf39c12, letter: 'D', textColor: '#ffffff' }, // オレンジ系
    8: { color: 0xe67e22, letter: 'D', textColor: '#f8f9fa' }, // 濃いオレンジ系
    9: { color: 0x9b59b6, letter: 'E', textColor: '#ffffff' }, // 紫系
    10: { color: 0x8e44ad, letter: 'E', textColor: '#f8f9fa' }, // 濃い紫系
    11: { color: 0x1abc9c, letter: 'F', textColor: '#ffffff' }, // ターコイズ系
    12: { color: 0x16a085, letter: 'F', textColor: '#f8f9fa' }, // 濃いターコイズ系
    13: { color: 0x95a5a6, letter: 'X', textColor: '#ffffff' }  // グレー（ペアにならない）
};

// ゲームの設定
const GAME_CONFIG = {
    CARD_WIDTH: 100, // カードの幅
    CARD_HEIGHT: 140, // カードの高さ
    BOARD_COLS: 3, // ボードの列数
    BOARD_ROWS: 3, // ボードの行数
    BOARD_PADDING: 20, // ボード全体のパディング
    BOARD_X: -50, // ボードのX座標オフセット（0=中央、正=右、負=左）
    BOARD_Y: -50, // ボードのY座標オフセット（0=中央、正=下、負=上）
    DECK_X: 600, // デッキのX座標（左に移動）
    DECK_Y: 400, // デッキのY座標（画面中央付近）
    MESSAGE_X: 400, // メッセージ表示のX座標
    MESSAGE_Y: 50, // メッセージ表示のY座標
    // カード残り枚数表示の設定
    CARD_COUNT_DISPLAY_Y_OFFSET: 100, // フィールドからのY座標オフセット
    CARD_COUNT_CARD_SCALE: 0.4, // カードアイコンのスケール
    CARD_COUNT_FONT_SIZE: 20, // 残り枚数テキストのフォントサイズを大きく
    CARD_COUNT_CARD_SPACING: 30, // カード間の間隔
    CARD_COUNT_PAIR_SPACING: 50, // ペア間の間隔
    CARD_COUNT_ROW_SPACING: 30 // 上下段の間隔
};


// --- BootScene (アセットの読み込みとテクスチャ生成) ---
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // ロード画面表示
        const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Loading cards...', {
            font: '30px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5, 0.5);

        // カード画像を読み込み
        this.load.image('card_back', 'assets/cards/card_back.png');
        for (let i = 1; i <= 13; i++) {
            this.load.image(`card_${i}`, `assets/cards/card_${i}.png`);
        }
    }

    create() {
        this.scene.start('GameScene');
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
        this.deckCounts = {}; // 各カードの残り枚数
        this.cardCountDisplays = []; // カード残り枚数表示オブジェクトの配列
        this.deckDisplayCards = []; // デッキ表示用のカードオブジェクト
        this.draggedCardValue = null; // ドラッグ中のカードの値
        this.deckBackImage = null; // デッキの裏向きカード画像
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
        const startX = (this.sys.game.config.width - (GAME_CONFIG.BOARD_COLS * GAME_CONFIG.CARD_WIDTH + (GAME_CONFIG.BOARD_COLS - 1) * GAME_CONFIG.BOARD_PADDING)) / 2 + GAME_CONFIG.BOARD_X;
        const startY = (this.sys.game.config.height / 2) - (GAME_CONFIG.BOARD_ROWS * GAME_CONFIG.CARD_HEIGHT + (GAME_CONFIG.BOARD_ROWS - 1) * GAME_CONFIG.BOARD_PADDING) / 2 + GAME_CONFIG.BOARD_Y;

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
        this.deck = [];
        // 13種類の絵柄のカードを4枚ずつ作成
        for (let i = 1; i <= 13; i++) {
            this.deckCounts[i] = 4; // 各カードの残り枚数を初期化
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
        this.deckBackImage = this.add.image(GAME_CONFIG.DECK_X, GAME_CONFIG.DECK_Y, 'card_back');
        
        // デッキの残り枚数を数字だけ表示（デッキ位置の右下）
        this.deckCountText = this.add.text(GAME_CONFIG.DECK_X + 30, GAME_CONFIG.DECK_Y + 50, `${this.deck.length + 1}`, {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(1000);

        // メッセージ表示
        this.messageText = this.add.text(GAME_CONFIG.MESSAGE_X, GAME_CONFIG.MESSAGE_Y, '', {
            fontSize: '32px',
            fill: '#ff0', // 黄色
            stroke: '#000', // 黒い縁取り
            strokeThickness: 4
        }).setOrigin(0.5);

        // 各カードの残り枚数表示を作成
        this.createCardCountDisplays();

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

            // 残り枚数を減らして表示を更新
            this.deckCounts[gameObject.cardValue]--;
            this.updateCardCountDisplay(gameObject.cardValue);

            // currentCardをnullに設定して、次のカードをめくったときに置いたカードが消えないようにする
            this.currentCard = null;

            this.messageText.setText(''); // メッセージをクリア

            // ペアチェックと消滅処理
            this.checkAndClearPairs(row, col);

            // 次のカードを配る（即座に実行）
            this.dealNextCard();
        });

        // ドラッグ開始時の処理
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.gameStarted) return;
            this.children.bringToTop(gameObject); // ドラッグ中のカードを手前に表示
            gameObject.setDepth(999); // デッキ残り枚数（1000）より低い深度に設定
            
            // ドラッグ中のカードの値を保存
            this.draggedCardValue = gameObject.cardValue;
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
            gameObject.setDepth(0); // 深度を元に戻す
            this.draggedCardValue = null; // ドラッグ中のカードの値をクリア
        });
    }

    dealNextCard() {
        // 現在のカードがあれば破棄（前のカードがボードに置かれずに残っている場合など）
        if (this.currentCard && this.currentCard.active) {
            this.currentCard.destroy();
            this.currentCard = null;
        }

        // ゲーム開始後にのみフィールドが全部埋まっているかチェック
        if (this.gameStarted) {
            this.checkGameEnd();
            
            // ゲームが停止している場合は次のカードを配らない
            if (!this.gameStarted) {
                return;
            }
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
        this.deckCountText.setText(`${this.deck.length + 1}`);
        
        // デッキの枚数が0のときは裏向きカードを非表示にする
        if (this.deck.length === 0) {
            this.deckBackImage.setVisible(false);
        } else {
            this.deckBackImage.setVisible(true);
        }
    }

    updateCardCountDisplay(cardValue) {
        if (this.cardCountDisplays[cardValue]) {
            this.cardCountDisplays[cardValue].countText.setText(`${this.deckCounts[cardValue]}`);
            
            // 残り枚数が0になったらアイコンを薄く表示
            if (this.deckCounts[cardValue] === 0) {
                this.cardCountDisplays[cardValue].cardIcon.setAlpha(0.3);
                this.cardCountDisplays[cardValue].countText.setAlpha(0.3);
            }
        }
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

        // 隣接するカードをチェック（配置したカード自体は除外）
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
                        this.board[cardData.r][cardData.c] = null; // ボードの内部状態を更新
                        // フェードアウトと縮小のアニメーション
                        this.tweens.add({
                            targets: cardObject,
                            alpha: 0,
                            scale: 0.5,
                            duration: 300,
                            ease: 'Power2',
                            onComplete: () => {
                                cardObject.destroy(); // アニメーション終了後にオブジェクトを破棄
                                this.cardsOnBoard[index] = null; // 参照もクリア
                            }
                        });
                    }
                }
            });
        }
    }

    checkGameEnd() {
        // フィールドが全部埋まっているかチェック
        let isBoardFull = true;
        for (let r = 0; r < GAME_CONFIG.BOARD_ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.BOARD_COLS; c++) {
                if (this.board[r][c] === null) {
                    isBoardFull = false;
                    break;
                }
            }
            if (!isBoardFull) break;
        }

        if (isBoardFull) {
            // フィールドが全部埋まった場合
            this.messageText.setText('ゲームオーバー！フィールドが埋まりました');
            this.gameStarted = false; // ゲームを停止
            
            // 画面クリックでゲームを再開
            this.input.once('pointerdown', () => {
                this.scene.restart();
            });
            return;
        }

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

    createCardCountDisplays() {
        // フィールド下に配置するため、フィールド位置から計算
        const fieldCenterY = (this.sys.game.config.height / 2) + GAME_CONFIG.BOARD_Y;
        const fieldHeight = GAME_CONFIG.BOARD_ROWS * GAME_CONFIG.CARD_HEIGHT + (GAME_CONFIG.BOARD_ROWS - 1) * GAME_CONFIG.BOARD_PADDING;
        const displayY = fieldCenterY + fieldHeight / 2 + GAME_CONFIG.CARD_COUNT_DISPLAY_Y_OFFSET;
        
        const cardSpacing = GAME_CONFIG.CARD_COUNT_CARD_SPACING;
        const cardScale = GAME_CONFIG.CARD_COUNT_CARD_SCALE;
        const pairSpacing = GAME_CONFIG.CARD_COUNT_PAIR_SPACING;
        
        // 6ペア + 1個別カード（13番）を配置（フィールド中央揃え）
        const startX = (this.sys.game.config.width - (6 * pairSpacing + cardSpacing)) / 2;

        // ペアA-F（1-12）を二段で表示
        for (let pairIndex = 0; pairIndex < 6; pairIndex++) {
            const pairX = startX + pairIndex * pairSpacing;
            
            // ペアの1つ目のカード（上段）
            const card1 = pairIndex * 2 + 1;
            const card1Y = displayY - GAME_CONFIG.CARD_COUNT_ROW_SPACING;
            
            // 小さいカードアイコン
            const cardIcon1 = this.add.image(pairX, card1Y - 10, `card_${card1}`).setScale(cardScale);
            
            // 残り枚数テキスト（カード中央に配置して被らせる）
            const countText1 = this.add.text(pairX, card1Y, `${this.deckCounts[card1]}`, {
                fontSize: GAME_CONFIG.CARD_COUNT_FONT_SIZE,
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.cardCountDisplays[card1] = {
                cardIcon: cardIcon1,
                countText: countText1
            };

            // ペアの2つ目のカード（下段）
            const card2 = pairIndex * 2 + 2;
            const card2Y = displayY + GAME_CONFIG.CARD_COUNT_ROW_SPACING;
            
            // 小さいカードアイコン
            const cardIcon2 = this.add.image(pairX, card2Y - 10, `card_${card2}`).setScale(cardScale);
            
            // 残り枚数テキスト（カード中央に配置して被らせる）
            const countText2 = this.add.text(pairX, card2Y, `${this.deckCounts[card2]}`, {
                fontSize: GAME_CONFIG.CARD_COUNT_FONT_SIZE,
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.cardCountDisplays[card2] = {
                cardIcon: cardIcon2,
                countText: countText2
            };
        }

        // 13番カード（個別）を右端に配置
        const card13X = startX + 6 * pairSpacing;
        const card13Y = displayY;
        
        // 小さいカードアイコン
        const cardIcon13 = this.add.image(card13X, card13Y - 10, `card_13`).setScale(cardScale);
        
        // 残り枚数テキスト（カード中央に配置して被らせる）
        const countText13 = this.add.text(card13X, card13Y, `${this.deckCounts[13]}`, {
            fontSize: GAME_CONFIG.CARD_COUNT_FONT_SIZE,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.cardCountDisplays[13] = {
            cardIcon: cardIcon13,
            countText: countText13
        };
    }
}

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
