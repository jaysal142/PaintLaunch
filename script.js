window.addEventListener('load', function() {
    let gameReady = false;

    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;
    canvas.height = 720;
    let hitFlash = 0;
    let boostFlash = 0;
    let cameraY = 0;
    let targetCameraY = 0;
    let enemies = [];
    let aerialEnemyTimer = 0;
    let aerialEnemyInterval = 500;
    let randomAerialInterval = Math.random() * 500 + 250;

    let score = 0;
    let highScore = 0;
    let leaderboard = [];
    let leaderboardTimer = 0;
    let lastScoredDistance = 0;
    const LEADERBOARD_FETCH_INTERVAL = 30000; // refresh every 30s

    let baseLives = 3;
    let lives = 3;
    let baseBoosts = 3;
    let gameOver = false;
    let gameStart = false;
    let currency = 0;
    let lastCoinScore = 0;
    let upgrades = { power: 0, speed: 0 };
    let cosmetics = { cannonPaint: null };
    let shopOpen = false;
    let inventoryOpen = false;

    let inventory = {
        cannons: ['base'], // base cannon always owned
        activeCannon: 'base'
    };

    let playerAuth = {
        loggedIn: false,
        username: null,
        token: null,
    };

    const shopItems = {
        cannon: [
            {
                label: 'Blue Paint',
                desc: 'A cool blue cannon',
                cost: 500,
                owned: false,
                onBuy: () => {
                    if (!inventory.cannons.includes('blue')) inventory.cannons.push('blue');
                    applyCannonSkin('blue');
                }
            },
            {
                label: 'Red Paint',
                desc: 'A fiery red cannon',
                cost: 2000,
                owned: false,
                onBuy: () => {
                    if (!inventory.cannons.includes('red')) inventory.cannons.push('red');
                    applyCannonSkin('red');
                }
            },
            {
                label: 'Gold Paint',
                desc: 'A royal gold cannon',
                cost: 8000,
                owned: false,
                onBuy: () => {
                    if (!inventory.cannons.includes('gold')) inventory.cannons.push('gold');
                    applyCannonSkin('gold');
                }
            },
            {
                label: 'Neon Paint',
                desc: 'A flashy neon cannon',
                cost: 30000,
                owned: false,
                onBuy: () => {
                    if (!inventory.cannons.includes('neon')) inventory.cannons.push('neon');
                    applyCannonSkin('neon');
                }
            },
        ],
        player: [
            {
                label: 'Extra Life',
                desc: '+1 temporary life',
                cost: 500,
                owned: false,
                repeatable: true,
                onBuy: () => { lives++; }
            },
            {
                label: 'More Life',
                desc: '+1 permanent life',
                cost: 1000,
                owned: false,
                repeatable: true,
                onBuy: () => { baseLives++; lives++; }
            },
        ],
        boost: [
            {
                label: 'Extra Boost',
                desc: '+1 temporary boost',
                cost: 250,
                owned: false,
                repeatable: true,
                onBuy: () => { player.boosts++; }
            },
            {
                label: 'Extra Boost',
                desc: '+1 parmanent boost',
                cost: 750,
                owned: false,
                repeatable: true,
                onBuy: () => { baseBoosts++; player.boosts++; }
            },
            {
                label: 'Boost Power',
                desc: 'Stronger boosts',
                cost: 1500,
                owned: false,
                repeatable: true,
                onBuy: () => { player.boostPower = (player.boostPower || 1) + 0.5; }
            }
        ]
    };

    let scale = 0.5;

    class InputHandler {
        constructor() {
            this.keys = [];
            this.clicked = false;
            this.spaceHeld = false;
            this.spaceFired = false;
            window.addEventListener('keydown', e => {
                if ((   e.key === 'ArrowDown' ||
                        e.key === 'ArrowUp')
                        && this.keys.indexOf(e.key) === -1) {
                    this.keys.push(e.key);
                }
                if (e.key === ' ' && !this.spaceHeld) {
                    this.spaceHeld = true;
                }
            });
            window.addEventListener('keyup', e => {
                if (    e.key === 'ArrowDown' ||
                        e.key === 'ArrowUp') {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
                }
                if (e.key === ' ') {
                    this.spaceHeld = false;
                    this.spaceFired = true;
                }
            });
            window.addEventListener('mousedown', e => {
                if (e.button === 0) {
                    this.clicked = true;
                    // start game
                    if (!gameReady) {
                        const rect = canvas.getBoundingClientRect();
                        const mx = e.clientX - rect.left;
                        const my = e.clientY - rect.top;
                        if (mx > canvas.width/2 - 110 && mx < canvas.width/2 + 110 && my > 300 && my < 360) {
                            gameReady = true;
                        }
                        return;
                    }
                    // game over
                    if (gameOver) {
                        const rect = canvas.getBoundingClientRect();
                        const mx = e.clientX - rect.left;
                        const my = e.clientY - rect.top;
                        // RESTART/PLAYAGAIN button
                        if (mx > canvas.width/2 - 110 && mx < canvas.width/2 + 110 && my > 590 && my < 650) {
                            reset();
                        }
                        return;
                    }
                    // aiming phase
                    if (gameStart) return;
                    const rect = canvas.getBoundingClientRect();
                    const mx = e.clientX - rect.left;
                    const my = e.clientY - rect.top;
                    // inventory button
                    if (mx > canvas.width - 120 && mx < canvas.width - 20 && my > 190 && my < 240) {
                        inventoryOpen = !inventoryOpen;
                        shopOpen = false;
                    }
                    // inventory slot clicks
                    if (inventoryOpen) {
                        const wx = canvas.width/2 - 250;
                        const wy = canvas.height/2 - 180;
                        const ww = 500;
                        const slotW = 90;
                        const slotH = 110;
                        const cols = 4;
                        const startX = wx + (ww - cols * (slotW + 10)) / 2;
                        const startY = wy + 75;
                        // close button
                        if (mx > wx + ww - 40 && mx < wx + ww && my > wy && my < wy + 40) {
                            inventoryOpen = false;
                        }
                        // slot clicks
                        inventory.cannons.forEach((key, i) => {
                            const col = i % cols;
                            const row = Math.floor(i / cols);
                            const sx = startX + col * (slotW + 10);
                            const sy = startY + row * (slotH + 10);
                            if (mx > sx && mx < sx + slotW && my > sy && my < sy + slotH) {
                                applyCannonSkin(key);
                            }
                        });
                    }
                    // sign in button
                    if (mx > canvas.width - 120 && mx < canvas.width - 20 && my > 130 && my < 180) {
                        document.getElementById('authModal').style.display = 'block';
                    }
                    // shop open button
                    if (mx > canvas.width - 120 && mx < canvas.width - 20 && my > 70 && my < 120) {
                        shopOpen = !shopOpen;
                    }
                    if (shopOpen) {
                        const wx = canvas.width/2 - 300;
                        const wy = 40;
                        const ww = 600;
                        const wh = canvas.height - 80;
                        const colW = ww / 3;
                        // close button
                        if (mx > wx + ww - 40 && mx < wx + ww && my > wy && my < wy + 40) {
                            shopOpen = false;
                        }
                        // buy buttons
                        const cols = ['cannon', 'player', 'boost'];
                        cols.forEach((key, ci) => {
                            shopItems[key].forEach((item, i) => {
                                const itemX = wx + ci * colW + 8;
                                const itemW = colW - 16;
                                const iy = wy + 100 + i * 130;
                                const itemH = 115;
                                const btnY = iy + itemH - 36;
                                const btnX = itemX + 8;
                                const btnW = itemW - 16;
                                if (mx > btnX && mx < btnX + btnW && my > btnY && my < btnY + 28) {
                                    if (currency >= item.cost && (!item.owned || item.repeatable)) {
                                        currency -= item.cost;
                                        if (!item.repeatable) item.owned = true;
                                        item.onBuy();
                                        savePlayerData();
                                    }
                                }
                            });
                        });
                    }
                }
            });
        }
    }

    class Cannon {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 520 * scale;
            this.height = 415 * scale;
            this.x = 10;
            this.y = this.gameHeight - this.height;
            this.image = document.getElementById('baseCannon');
            this.active = true;
        }
        draw(context, barrelX) {
            if (!this.active) return;
            this.x = barrelX - this.width/1.9;
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    class Barrel {
        constructor(gameWidth, gameHeight, cannonW, cannonH) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 480 * scale;
            this.height = 230 * scale;
            this.x = cannonW/1.9;
            this.y = this.gameHeight - cannonH/1.56;
            this.image = document.getElementById('baseBarrel');
            this.cannonW = cannonW;
            this.cannonH = cannonH;
            this.angle = 0;
            this.active = true;
            this.charge = 0;
            this.chargeDir = 1;
        }
        draw(context) {
            if (!this.active) return;
            context.save();
            context.translate(this.x, this.y + this.height/2);
            context.rotate(this.angle * Math.PI / 180);
            context.drawImage(this.image, 0, -this.height/2, this.width, this.height);
            context.restore();
            this.drawMeter(context);
        }
        drawMeter(context) {
            if (gameStart || !this.charge) return;
            const meterX = this.x - 68;
            const meterY = this.y - 40;
            const meterW = 120;
            const meterH = 14;
            const ratio = this.charge / 100;
            const r = Math.floor(255 * Math.min(ratio * 2, 1));
            const g = Math.floor(255 * Math.min((1 - ratio) * 2, 1));
            context.fillStyle = 'rgba(0,0,0,0.4)';
            context.fillRect(meterX, meterY, meterW, meterH);
            context.fillStyle = `rgb(${r},${g},0)`;
            context.fillRect(meterX, meterY, meterW * ratio, meterH);
            context.strokeStyle = 'white';
            context.lineWidth = 1;
            context.strokeRect(meterX, meterY, meterW, meterH);
        }
        update(input) {
            if (gameStart) {
                this.x -= player.speed;
                if (this.x < -this.width) {
                    this.active = false;
                    cannon.active = false;
                }
                return;
            }
            // input
            if (input.keys.indexOf('ArrowUp') > -1) {
                this.angle -= 2;
            } else if (input.keys.indexOf('ArrowDown') > -1) {
                this.angle += 2;
            }
            if (input.spaceHeld) {
                this.charge += this.chargeDir * 5;
                if (this.charge >= 100 || this.charge <= 0) {
                    this.chargeDir *= -1;
                    this.charge = Math.max(0, Math.min(100, this.charge));
                }
            }
            if (input.spaceFired) {
                input.spaceFired = false;
                gameStart = true;
                const exit = this.getExit();
                player.x = exit.x - player.width/2;
                player.y = exit.y - player.height/2;
                player.power = 10 + this.charge * 0.3 + upgrades.power;
                player.launch(this.angle);
                this.charge = 0;
            }
            this.angle = Math.max(-60, Math.min(0, this.angle));
        }
        getExit() {
            const radians = this.angle * Math.PI / 180;
            const pivotX = this.x;
            const pivotY = this.y + this.height / 2;
            const exitX = pivotX + Math.cos(radians) * this.width;
            const exitY = pivotY + Math.sin(radians) * this.width;
            return {x: exitX, y: exitY };
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 200 * scale;
            this.height = 200 * scale;
            this.x = 10;
            this.y = this.gameHeight - this.height;
            this.image = document.getElementById('playerBase');
            this.frame = 0;
            this.minAirFrame = 0;
            this.maxAirFrame = 11;
            this.minGroundFrame = 12;
            this.maxGroundFrame = 21;
            this.cols = 8;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 0;
            this.vy = 0;
            this.peakReached = false;
            this.stalling = false;
            this.stallTimer = 0;
            this.stallDuration = 180; // frames (~3 seconds), adjust to taste
            this.weight = 1.5;
            this.power = 60;
            this.boosts = 3;
        }
        draw(context) {
            const frameW = 200; // original sprite frame size
            const frameH = 200;
            const frameX = this.frame % this.cols;
            const frameY = Math.floor(this.frame / this.cols);
            context.drawImage(this.image, frameX * frameW, frameY * frameH, frameW, frameH, this.x, this.y, this.width, this.height);
        }
        update(deltaTime, enemies, bgHeight) {
            if (this.justLaunched) {
                this.justLaunched = false;
                input.clicked = false; // discard any click that happened on launch frame
            }
            // boost logic
            if (this.launched && input.clicked && this.boosts > 0) {
                const power = this.boostPower || 1;
                this.vy = Math.min(this.vy, 0) - 25 * power; // clamp to 0 first, then apply boost
                this.speed += 5 * power;
                this.boosts--;
                boostFlash = 10;
                input.clicked = false;
            }
            // collision detection
            enemies.forEach(enemy => {
                const dx = (enemy.x + enemy.width/2) - (this.x + this.width/2);
                const dy = (enemy.y + enemy.height/2) - (this.y + this.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < enemy.width/2 + this.width/2) {
                    enemy.markedForDeletion = true;
                    if (enemy instanceof Enemy3) {
                        // where on the enemy did we hit (0 = top, 1 = bottom)
                        const hitPos = (this.y + this.height/2 - enemy.y) / enemy.height;
                        const hitStrength = 20 + this.speed * 0.5;
                        if (hitPos < 0.35) {
                            // top third — up and forward
                            this.vy -= hitStrength * 1.2;
                            this.speed += hitStrength * 0.6;
                        } else if (hitPos > 0.65) {
                            // bottom third — down and forward
                            this.vy += hitStrength * 0.8;
                            this.speed += hitStrength * 0.4;
                        } else {
                            // middle — mostly forward
                            this.speed += hitStrength * 1.0;
                            this.vy *= 0.5;
                        }
                    } else {
                        lives--;
                        hitFlash = 20;
                        if (lives <= 0) { gameOver = true; }
                    }
                }
            });
            // sprite animation
            if (this.frameTimer >= this.frameInterval) {
                this.frame++;
                if (this.onGround()) {
                    if (this.frame > this.maxGroundFrame || this.frame < this.minGroundFrame) this.frame = this.minGroundFrame;
                } else {
                    if (this.frame > this.maxAirFrame || this.frame >= this.minGroundFrame) this.frame = this.minAirFrame;
                }
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            // horizontal movement
            if (this.launched) {
                const decay = this.onGround() ? 0.99 : 0.99999;
                this.speed *= decay;
                this.distance = (this.distance || 0) + this.speed;
            }
            if (this.launched && this.speed < 1 && this.onGround()) {
                gameOver = true;
            }
            // vertical movement
            this.y += this.vy;
            if (!this.onGround()) {
                if (this.vy >= 0 && !this.peakReached) this.peakReached = true;
                const traveled = canvas.height - this.y - this.height;
                const pastThreshold = traveled > bgHeight * 0.5;
                if (this.peakReached && pastThreshold && !this.stalling && this.stallTimer === 0) {
                    const heightRatio = Math.min(1, (traveled - bgHeight * 0.5) / (bgHeight * 0.5));
                    this.stallDuration = Math.floor(60 + heightRatio * 480); // 1s at threshold, up to 9s at top
                    this.stalling = true;
                }
                if (this.stalling) {
                    this.vy *= 0.85; // bleed off velocity quickly so they float
                    this.stallTimer++;
                    if (this.stallTimer >= this.stallDuration) {
                        this.stalling = false;
                    }
                } else {
                    let gravityScale = 1;
                    if (this.peakReached && this.vy < 0) {
                        // player is moving upward again (boosted) — reset peak so arc behaves naturally
                        this.peakReached = false;
                        this.stalling = false;
                        this.stallTimer = 0;
                    }
                    if (this.peakReached) {
                        const heightFactor = Math.max(0, Math.min(1, traveled / (bgHeight * 0.3)));
                        const speedScale = Math.max(0.05, 1 - (this.speed / (20 + upgrades.power + upgrades.speed)) * 0.95);
                        const combinedScale = 1 - (1 - speedScale) * heightFactor;
                        if (pastThreshold) {
                            const heightRatio = Math.max(0, (traveled - bgHeight * 0.5) / (bgHeight * 0.5));
                            gravityScale = Math.max(0.1, 1 - heightRatio * 0.9);
                        }
                        gravityScale *= combinedScale;
                    }
                    this.vy += this.weight * gravityScale;
                }
            }
            if (this.y >= this.gameHeight - this.height) {
                this.y = this.gameHeight - this.height;
                this.vy = 0;
                this.peakReached = false;
                this.stalling = false;
                this.stallTimer = 0;
            }
        }
        onGround() {
            return this.y >= this.gameHeight - this.height;
        }
        launch(angle) {
            const radians = angle * Math.PI / 180;
            const power = this.power;
            this.speed = Math.cos(radians) * power + upgrades.speed;
            this.vy = Math.sin(radians) * power;
            this.launched = true;
            this.justLaunched = true; // guard flag
        }
    }

    class Background {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 2304;
            this.height = 9792;
            this.layers = [
                { image: document.getElementById('backgroundImage1'), speedX: 0.1, speedY: 0.1, x: 0 },
                { image: document.getElementById('backgroundImage2'), speedX: 0.2, speedY: 0.2, x: 0 },
                { image: document.getElementById('backgroundImage3'), speedX: 0.4, speedY: 0.4, x: 0 },
                { image: document.getElementById('backgroundImage4'), speedX: 0.6, speedY: 0.6, x: 0 },
                { image: document.getElementById('backgroundImage5'), speedX: 0.8, speedY: 0.8, x: 0 },
                { image: document.getElementById('backgroundImage6'), speedX: 1.0, speedY: 1.0, x: 0 },
            ];
            // pre-render each layer to an offscreen canvas
            this.layers.forEach(layer => {
                const offscreen = document.createElement('canvas');
                offscreen.width = this.width;
                offscreen.height = this.height; // keep full height for vertical scroll
                const offCtx = offscreen.getContext('2d', { willReadFrequently: false });
                offCtx.drawImage(layer.image, 0, 0);
                layer.offscreen = offscreen;
                // free the original image from memory once drawn to offscreen
                layer.image.src = '';
            });
        }
        draw(context) {
            context.imageSmoothingEnabled = false;
            this.layers.forEach(layer => {
                const startY = -this.height + this.gameHeight + cameraY * 0.5 * layer.speedY;
                context.drawImage(layer.offscreen, layer.x, startY, this.width, this.height);
                context.drawImage(layer.offscreen, layer.x + this.width - 5, startY, this.width, this.height);
            });
        }
        update(playerSpeed) {
            this.layers.forEach(layer => {
                layer.x -= playerSpeed * layer.speedX;
                if (layer.x < -this.width + 5) layer.x = 0;
            });
        }
    }

    class Enemy {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 160 * scale;
            this.height = 119 * scale;
            this.image = document.getElementById('enemyImage');
            this.x = this.gameWidth;
            this.y = this.gameHeight - this.height;
            this.frameX = 0;
            this.maxFrame = 5;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 8;
            this.markedForDeletion = false;
        }
        draw(context) {
            const frameW = 160; // original sprite frame size
            const frameH = 119;
            context.drawImage(this.image, this.frameX * frameW, 0, frameW, frameH, this.x, this.y, this.width, this.height);
        }
        update(deltaTime, worldSpeed) {
            // sprite animation
            if (this.frameTimer > this.frameInterval) {
                if (this.frameX >= this.maxFrame) this.frameX = 0;
                else this.frameX++;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
           // horizontal movement
            this.x -= this.speed + Math.max(0, worldSpeed);
            if (this.x < 0 - this.width) {
                this.markedForDeletion = true;
                score++;
            }
        }
    }

    class Enemy2 extends Enemy {
        constructor(gameWidth, gameHeight) {
            super(gameWidth, gameHeight);
            this.width = 160 * scale;
            this.height = 119 * scale;
            this.image = document.getElementById('enemy2Image');
            this.maxFrame = 5;
            this.speed = 12;
            this.y = player.y - Math.random() * 600;
        }
        draw(context) {
            const frameW = 160;
            const frameH = 119;
            context.drawImage(this.image, this.frameX * frameW, 0, frameW, frameH, this.x, this.y, this.width, this.height);
        }
    }

    class Enemy3 extends Enemy {
        constructor(gameWidth, gameHeight) {
            super(gameWidth, gameHeight);
            this.width = 160 * scale;
            this.height = 119 * scale;
            this.image = document.getElementById('enemy3Image');
            this.maxFrame = 5;
            this.speed = 5;
            this.y = player.y - Math.random() * 600;
        }
        draw(context) {
            const frameW = 160;
            const frameH = 119;
            context.drawImage(this.image, this.frameX * frameW, 0, frameW, frameH, this.x, this.y, this.width, this.height);
        }
    }

    function drawStartScreen(context) {
        // overlay
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawText(context, 'PAINT LAUNCH', canvas.width/2, 180, '60px PixelOperator', 'white', 'center');
        drawText(context, 'launch the paintboy across the sky', canvas.width/2, 230, '18px PixelOperator', 'rgba(255,255,255,0.6)', 'center');
        // start button
        context.fillStyle = '#2980b9';
        context.fillRect(canvas.width/2 - 110, 300, 220, 60);
        context.strokeStyle = 'rgba(255,255,255,0.3)';
        context.lineWidth = 2;
        context.strokeRect(canvas.width/2 - 110, 300, 220, 60);
        drawText(context, 'PLAY', canvas.width/2, 340, '28px PixelOperator', 'white', 'center');
        // controls preview
        drawText(context, 'HOW TO PLAY', canvas.width/2, 420, '18px PixelOperator', 'rgba(255,255,255,0.5)', 'center');
        const controls = [
            ['↑ ↓', 'Aim the cannon'],
            ['SPACE', 'Charge & fire'],
            ['CLICK', 'Boost mid-flight'],
            ['Enemy3', 'Bounce off for extra speed'],
        ];
        controls.forEach((row, i) => {
            drawText(context, row[0], canvas.width/2 - 80, 450 + i * 34, '16px PixelOperator', '#FFD700', 'right');
            drawText(context, row[1], canvas.width/2 - 60, 450 + i * 34, '16px PixelOperator', 'white', 'left');
        });
    }

    function drawAimingOverlay(context) {
        if (gameStart || !gameReady) return;
        // bottom center control hints
        const hints = [
            '↑ ↓  Aim',
            'SPACE  Charge & Fire',
            'CLICK  Boost in flight',
        ];
        hints.forEach((hint, i) => {
            drawText(context, hint, canvas.width/2, canvas.height - 80 + i * 24, '15px PixelOperator', 'rgba(255,255,255,0.7)', 'center');
        });
    }

    function drawTrajectory(context) {
        if (gameStart || !barrel) return;
        const exit = barrel.getExit();
        const power = 10 + barrel.charge * 0.3 + upgrades.power;
        const radians = barrel.angle * Math.PI / 180;
        let vx = Math.cos(radians) * power + upgrades.speed;
        let vy = Math.sin(radians) * power;
        let x = exit.x;
        let y = exit.y;
        const ratio = barrel.charge / 100;
        const r = Math.floor(255 * Math.min(ratio * 2, 1));
        const g = Math.floor(255 * Math.min((1 - ratio) * 2, 1));
        context.save();
        context.setLineDash([6, 6]);
        context.strokeStyle = `rgb(${r},${g},0, 0.8)`;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(x, y);
        for (let i = 0; i < 120; i++) {
            vx *= 0.99999;
            vy += player.weight;
            x += vx;
            y += vy;
            if (y >= canvas.height - player.height) break;
            context.lineTo(x, y);
        }
        context.stroke();
        context.setLineDash([]);
        context.restore();
    }

    function drawShop(context) {
        if (gameStart || !gameReady) return;
        // shop button
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(canvas.width - 120, 70, 100, 50);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.strokeRect(canvas.width - 120, 70, 100, 50);
        drawText(context, 'SHOP', canvas.width - 109, 105, '22px PixelOperator');
        // inventory button
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(canvas.width - 130, 190, 110, 50);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.strokeRect(canvas.width - 130, 190, 110, 50);
        drawText(context, 'INVENTORY', canvas.width - 126, 222, '13px PixelOperator');
        // coins
        drawText(context, 'Coins: ' + currency, canvas.width - 20, 40, '22px PixelOperator', 'gold', 'right');
        // sign in button
        const authLabel = playerAuth.loggedIn ? playerAuth.username : 'SIGN IN';
        context.font = '16px PixelOperator';
        const authLabelWidth = context.measureText(authLabel).width;
        const authBtnW = Math.max(100, authLabelWidth + 20);
        const authBtnX = canvas.width - authBtnW - 20;
        context.fillStyle = playerAuth.loggedIn ? 'rgba(0,150,0,0.6)' : 'rgba(0,0,0,0.6)';
        context.fillRect(authBtnX, 130, authBtnW, 50);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.strokeRect(authBtnX, 130, authBtnW, 50);
        drawText(context, authLabel, authBtnX + 10, 160, '16px PixelOperator');
        if (!shopOpen) return;
        // overlay
        context.fillStyle = 'rgba(0,0,0,0.75)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // window
        const wx = canvas.width/2 - 300;
        const wy = 40;
        const ww = 600;
        const wh = canvas.height - 80;
        context.fillStyle = '#1a1a2e';
        context.fillRect(wx, wy, ww, wh);
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(wx, wy, ww, wh);
        // title
        drawText(context, 'SHOP', canvas.width/2, wy + 36, '28px PixelOperator', 'white', 'center');
        drawText(context, 'Coins: ' + currency, canvas.width/2, wy + 60, '18px PixelOperator', 'gold', 'center');
        // columns
        const cols = ['cannon', 'player', 'boost'];
        const colLabels = ['Cannon', 'Player', 'Boost'];
        const colW = ww / 3;
        cols.forEach((key, ci) => {
            const colX = wx + ci * colW + colW / 2;
            drawText(context, colLabels[ci], colX, wy + 90, '18px PixelOperator', 'rgba(255,255,255,0.7)', 'center');
            shopItems[key].forEach((item, i) => {
                const itemX = wx + ci * colW + 8;
                const itemW = colW - 16;
                const iy = wy + 100 + i * 130;
                const itemH = 115;
                const btnY = iy + itemH - 36;
                const btnX = itemX + 8;
                const btnW = itemW - 16;
                context.fillStyle = item.owned && !item.repeatable ? 'rgba(0,200,0,0.15)' : 'rgba(255,255,255,0.07)';
                context.fillRect(itemX, iy, itemW, itemH);
                context.strokeStyle = item.owned && !item.repeatable ? 'rgba(0,200,0,0.5)' : 'rgba(255,255,255,0.2)';
                context.strokeRect(itemX, iy, itemW, itemH);
                drawText(context, item.label, colX, iy + 24, '14px PixelOperator', 'white', 'center');
                drawText(context, item.desc, colX, iy + 46, '12px PixelOperator', 'rgba(255,255,255,0.6)', 'center');
                context.fillStyle = item.owned && !item.repeatable ? '#27ae60' : currency >= item.cost ? '#2980b9' : '#555';
                context.fillRect(btnX, btnY, btnW, 28);
                drawText(context, item.owned && !item.repeatable ? 'OWNED' : item.cost + 'c', colX, btnY + 20, '13px PixelOperator', 'white', 'center');
            });
        });
        // close button
        context.fillStyle = '#c0392b';
        context.fillRect(wx + ww - 40, wy, 40, 40);
        drawText(context, 'X', wx + ww - 20, wy + 28, '24px PixelOperator', 'white', 'center');
    }

    function drawInventory(context) {
        if (gameStart || !inventoryOpen || !gameReady) return;
        const cannonData = {
            base: { label: 'Base',  color: '#888' },
            blue: { label: 'Blue',  color: '#2980b9' },
            red:  { label: 'Red',   color: '#c0392b' },
            gold: { label: 'Gold',  color: '#f39c12' },
            neon: { label: 'Neon',  color: '#00ffcc' },
        };
        // overlay
        context.fillStyle = 'rgba(0,0,0,0.75)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // window
        const wx = canvas.width/2 - 250;
        const wy = canvas.height/2 - 180;
        const ww = 500;
        const wh = 360;
        context.fillStyle = '#1a1a2e';
        context.fillRect(wx, wy, ww, wh);
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(wx, wy, ww, wh);
        // title
        context.font = '24px PixelOperator';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('INVENTORY', canvas.width/2, wy + 36);
        context.font = '14px PixelOperator';
        context.fillStyle = 'rgba(255,255,255,0.4)';
        context.fillText('select a cannon to equip', canvas.width/2, wy + 58);
        // cannon slots
        const slotW = 90;
        const slotH = 110;
        const cols = 4;
        const startX = wx + (ww - cols * (slotW + 10)) / 2;
        const startY = wy + 75;
        inventory.cannons.forEach((key, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = startX + col * (slotW + 10);
            const sy = startY + row * (slotH + 10);
            const data = cannonData[key];
            const isActive = key === inventory.activeCannon;
            context.fillStyle = isActive ? 'rgba(41,128,185,0.3)' : 'rgba(255,255,255,0.07)';
            context.fillRect(sx, sy, slotW, slotH);
            context.strokeStyle = isActive ? '#2980b9' : 'rgba(255,255,255,0.2)';
            context.lineWidth = isActive ? 2 : 1;
            context.strokeRect(sx, sy, slotW, slotH);
            // cannon color swatch
            context.fillStyle = data.color;
            context.fillRect(sx + 20, sy + 15, slotW - 40, 40);
            // label
            context.fillStyle = 'white';
            context.font = '12px PixelOperator';
            context.textAlign = 'center';
            context.fillText(data.label, sx + slotW/2, sy + 72);
            // equipped badge
            if (isActive) {
                context.fillStyle = '#2980b9';
                context.fillRect(sx + 10, sy + 82, slotW - 20, 20);
                context.fillStyle = 'white';
                context.font = '11px PixelOperator';
                context.fillText('EQUIPPED', sx + slotW/2, sy + 96);
            } else {
                context.fillStyle = 'rgba(255,255,255,0.15)';
                context.fillRect(sx + 10, sy + 82, slotW - 20, 20);
                context.fillStyle = 'rgba(255,255,255,0.6)';
                context.font = '11px PixelOperator';
                context.fillText('EQUIP', sx + slotW/2, sy + 96);
            }
        });

        // close button
        context.fillStyle = '#c0392b';
        context.fillRect(wx + ww - 40, wy, 40, 40);
        context.fillStyle = 'white';
        context.font = '24px PixelOperator';
        context.textAlign = 'center';
        context.fillText('X', wx + ww - 20, wy + 28);
    }

    function applyCannonSkin(p) {
        if (!cannon || !barrel || !player) return;
        inventory.activeCannon = p;
        cosmetics.cannonPaint = p === 'base' ? null : p;
        cannon.image = document.getElementById(p + 'Cannon');
        barrel.image = document.getElementById(p + 'Barrel');
        player.image = document.getElementById(p === 'base' ? 'playerBase' : 'player' + p.charAt(0).toUpperCase() + p.slice(1));
        const upgradeMap = {
            base: { power: 0,   speed: 0  },
            blue: { power: 5,   speed: 1  },
            red:  { power: 15,  speed: 3  },
            gold: { power: 35,  speed: 8  },
            neon: { power: 70,  speed: 18 }
        };
        const stats = upgradeMap[p];
        upgrades.power = stats.power;
        upgrades.speed = stats.speed;
        savePlayerData();
    }

    function handleEnemies(deltaTime) {
        if (enemyTimer > enemyInterval + randomEnemyInterval) {
            enemies.push(new Enemy(canvas.width, canvas.height));
            randomEnemyInterval = Math.random() * 1000 + 500;
            enemyTimer = 0;
        } else {
            enemyTimer += deltaTime;
        }

        if (aerialEnemyTimer > aerialEnemyInterval + randomAerialInterval) {
            const aerialTypes = [Enemy2, Enemy3];
            const Type = aerialTypes[Math.floor(Math.random() * aerialTypes.length)];
            enemies.push(new Type(canvas.width, canvas.height));
            randomAerialInterval = Math.random() * 500 + 250;
            aerialEnemyTimer = 0;
        } else {
            aerialEnemyTimer += deltaTime;
        }

        enemies.forEach(enemy => {
            enemy.draw(ctx);
            enemy.update(deltaTime, player.speed);
        });
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    }

    function drawText(context, text, x, y, font, color = 'white', align = 'left') {
        context.font = font;
        context.textAlign = align;
        context.strokeStyle = 'black';
        context.lineWidth = 4;
        context.lineJoin = 'round';
        context.strokeText(text, x, y);
        context.fillStyle = color;
        context.fillText(text, x, y);
    }

    function displayStatusText(context) {
        if (gameStart && !gameOver) {
            const newDistance = Math.floor(player.distance / 100) || 0;
            if (newDistance > lastScoredDistance) {
                score += newDistance - lastScoredDistance;
                lastScoredDistance = newDistance;
            }
        }
        if (!gameOver) {
            // boosts remaining
            const boostCount = player.boosts || 0;
            const totalBoosts = baseBoosts;
            const squareSize = 20;
            const gap = 4;
            const totalWidth = totalBoosts * (squareSize + gap);
            const startX = canvas.width - 20 - totalWidth;
            for (let i = 0; i < totalBoosts; i++) {
                context.fillStyle = i < boostCount ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.2)';
                context.fillRect(startX + i * (squareSize + gap), canvas.height - 40, squareSize, squareSize);
            }
            drawText(context, 'BOOSTS', startX - 8, canvas.height - 24, '16px PixelOperator', 'white', 'right');
            // score
            drawText(context, 'Score: ' + score, 20, 50, '40px PixelOperator');
            // lives
            drawText(context, 'Lives: ' + lives, 20, 100, '30px PixelOperator');
            // leaderboard
            drawText(context, 'GLOBAL TOP 3', 20, 150, '16px PixelOperator', 'rgba(255,255,255,0.9)');
            if (leaderboard.length === 0) {
                drawText(context, 'no scores yet', 20, 172, '16px PixelOperator', 'rgba(255,255,255,0.5)');
            } else {
                const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
                leaderboard.slice(0, 3).forEach((entry, i) => {
                    drawText(context, `${i + 1}. ${entry.username}  ${entry.score}`, 20, 172 + i * 22, '16px PixelOperator', medals[i]);
                });
            }
            // refresh leaderboard periodically
            if (gameStart) {
                leaderboardTimer += 16;
                if (leaderboardTimer > LEADERBOARD_FETCH_INTERVAL) {
                    leaderboardTimer = 0;
                    fetchLeaderboard();
                }
            }
        // GAME OVER SCREEN
        } else {
            if (score > highScore) {
                highScore = score;
                savePlayerData();
                if (playerAuth.loggedIn) {
                    fetch('http://localhost/paintlaunch/highscore.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: playerAuth.token, score: highScore })
                    })
                    .then(() => fetchLeaderboard())
                    .catch(() => {});
                }
            }
            const milestone = Math.floor(score / 1);
            if (milestone > lastCoinScore) {
                context._coinsEarned = (milestone - lastCoinScore) * 1;
                currency += context._coinsEarned;
                lastCoinScore = milestone;
            }
            const coinsEarned = context._coinsEarned || 0;
            // game over screen
            drawText(context, 'GAME OVER!', canvas.width/2, 120, '50px PixelOperator', 'white', 'center');
            // score section
            drawText(context, 'SCORE', canvas.width/2, 195, '18px PixelOperator', 'rgba(255,255,255,0.5)', 'center');
            drawText(context, '' + score, canvas.width/2, 240, '40px PixelOperator', 'white', 'center');
            // high score
            drawText(context, 'BEST', canvas.width/2, 280, '18px PixelOperator', 'rgba(255,255,255,0.5)', 'center');
            drawText(context, '' + highScore, canvas.width/2, 325, '40px PixelOperator', '#FFD700', 'center');
            // coins earned
            drawText(context, 'COINS EARNED', canvas.width/2, 370, '18px PixelOperator', 'rgba(255,255,255,0.5)', 'center');
            drawText(context, '+' + coinsEarned, canvas.width/2, 410, '32px PixelOperator', 'gold', 'center');
            // divider
            context.strokeStyle = 'rgba(255,255,255,0.2)';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(canvas.width/2 - 150, 430);
            context.lineTo(canvas.width/2 + 150, 430);
            context.stroke();
            // leaderboard
            drawText(context, 'WORLD TOP 3', canvas.width/2, 460, '18px PixelOperator', 'rgba(255,255,255,0.6)', 'center');
            if (leaderboard.length === 0) {
                drawText(context, 'no scores yet', canvas.width/2, 490, '16px PixelOperator', 'rgba(255,255,255,0.3)', 'center');
            } else {
                const medals = ['#FFD700', '#C0C0C0', '#CD7F32'];
                leaderboard.slice(0, 3).forEach((entry, i) => {
                    drawText(context, `${i + 1}.  ${entry.username}`, canvas.width/2 - 60, 490 + i * 28, '16px PixelOperator', medals[i], 'left');
                    drawText(context, '' + entry.score, canvas.width/2 + 60, 490 + i * 28, '16px PixelOperator', medals[i], 'right');
                });
            }
            // play again button
            context.fillStyle = '#2980b9';
            context.fillRect(canvas.width/2 - 110, 590, 220, 60);
            context.strokeStyle = 'rgba(255,255,255,0.3)';
            context.lineWidth = 2;
            context.strokeRect(canvas.width/2 - 110, 590, 220, 60);
            drawText(context, 'PLAY AGAIN', canvas.width/2, 630, '24px PixelOperator', 'white', 'center');
        }
    }

    function reset() {
        score = 0;
        lastScoredDistance = 0;
        lastCoinScore = 0;
        ctx._coinsEarned = 0;
        lives = baseLives;
        player.boosts = baseBoosts;
        gameOver = false;
        gameStart = false;
        enemies = [];
        enemyTimer = 0;
        aerialEnemyTimer = 0;
        cameraY = 0;
        targetCameraY = 0;
        player.x = 10;
        player.y = player.gameHeight - player.height;
        player.speed = 0;
        player.vy = 0;
        player.peakReached = false;
        player.stalling = false;
        player.stallTimer = 0;
        player.launched = false;
        player.distance = 0;
        player.frame = 0;
        cannon = new Cannon(canvas.width, canvas.height);
        barrel = new Barrel(canvas.width, canvas.height, cannon.width, cannon.height);
        applyCannonSkin(inventory.activeCannon);
        requestAnimationFrame(animate);
    }

    function savePlayerData() {
        if (!playerAuth.loggedIn) return;

        const saveData = {
            token: playerAuth.token,
            currency,
            highScore,
            baseLives,
            baseBoosts,
            upgrades,
            inventory: {
                cannons: inventory.cannons,
                activeCannon: inventory.activeCannon
            },
            boostPower: player.boostPower || 1,
            shopItems: {
                cannon: shopItems.cannon.map(i => ({ label: i.label, owned: i.owned })),
                player: shopItems.player.map(i => ({ label: i.label, owned: i.owned })),
                boost: shopItems.boost.map(i => ({ label: i.label, owned: i.owned })),
            }
        };

        // TODO: implement POST to your save endpoint
        // expected request:  saveData object above
        // expected response: { success: true } or { success: false, message: '...' }
        fetch('http://localhost/paintlaunch/save.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        }).catch(() => {});
    }

    function loadPlayerData() {
        if (!playerAuth.loggedIn) return;

        // TODO: implement GET from your load endpoint
        // expected request:  token as query param
        // expected response: { success: true, data: { currency, highScore, baseLives, upgrades, inventory, boostPower, shopItems } }
        fetch(`http://localhost/paintlaunch/load.php?token=${playerAuth.token}`)
            .then(res => res.json())
            .then(data => {
                if (!data.success) return;
                const d = data.data;
                currency = d.currency ?? currency;
                highScore = d.highScore ?? highScore;
                baseLives = d.baseLives ?? baseLives;
                baseBoosts = d.baseBoosts ?? baseBoosts;
                lives = baseLives;
                upgrades.power = d.upgrades?.power ?? upgrades.power;
                upgrades.speed = d.upgrades?.speed ?? upgrades.speed;
                player.boostPower = d.boostPower ?? 1;
                if (d.inventory) {
                    inventory.cannons = d.inventory.cannons ?? inventory.cannons;
                    inventory.activeCannon = d.inventory.activeCannon ?? inventory.activeCannon;
                }
                if (d.shopItems) {
                    ['cannon', 'player', 'boost'].forEach(cat => {
                        d.shopItems[cat]?.forEach(saved => {
                            const match = shopItems[cat].find(i => i.label === saved.label);
                            if (match) match.owned = saved.owned;
                        });
                    });
                }
                applyCannonSkin(inventory.activeCannon);
            })
            .catch(() => {});
    }

    function fetchLeaderboard() {
        // TODO: implement GET from your leaderboard endpoint
        // expected response: { success: true, scores: [ {username, score}, {username, score}, {username, score} ] }
        // top 3 only, sorted by score descending
        fetch('http://localhost/paintlaunch/leaderboard.php')
            .then(res => {
                if (!res.ok) throw new Error('server unavailable');
                return res.json();
            })
            .then(data => {
                if (data.success) leaderboard = data.scores;
            })
            .catch(() => {}); // silent fail
    }
    setTimeout(fetchLeaderboard, 2000); // fetch on load

    const input = new InputHandler();
    let cannon = new Cannon(canvas.width, canvas.height);
    let barrel = new Barrel(canvas.width, canvas.height, cannon.width, cannon.height);
    const player = new Player(canvas.width, canvas.height);
    const background = new Background(canvas.width, canvas.height);

    //#region developer access
    window.dev = {
        setCurrency: (v) => { currency = v; },
        setLives: (v) => { lives = v; },
        setScore: (v) => { score = v; },
        setUpgrade: (k, v) => { upgrades[k] = v; },
        addBoosts: (v) => { player.boosts += v; },
        setBoostPower: (v) => { player.boostPower = v; },
    };
    // dev panel
    let devUnlocked = false;
    function createDevPanel() {
        // login button
        const devBtn = document.createElement('button');
        devBtn.textContent = 'DEV';
        devBtn.style.cssText = 'position:fixed;bottom:10px;right:10px;padding:4px 8px;font-size:11px;opacity:0.4;cursor:pointer;z-index:999;background:#111;color:#fff;border:1px solid #555;';
        document.body.appendChild(devBtn);
        // login modal
        const loginModal = document.createElement('div');
        loginModal.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid white;padding:20px;z-index:1000;color:white;font-family:monospace;min-width:260px;';
        loginModal.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <span style="font-size:14px;">DEV LOGIN</span>
                <button id="loginCloseBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">✕</button>
            </div>
            <input id="devPassword" type="password" placeholder="password" style="width:100%;padding:6px;background:#111;color:#fff;border:1px solid #555;margin-bottom:10px;box-sizing:border-box;">
            <button id="devLoginBtn" style="width:100%;padding:6px;background:#2980b9;color:white;border:none;cursor:pointer;">ENTER</button>
            <div id="devLoginError" style="color:red;font-size:12px;margin-top:6px;display:none;">incorrect password</div>
        `;
        document.body.appendChild(loginModal);
        // dev console modal
        const devConsole = document.createElement('div');
        devConsole.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid #2980b9;padding:20px;z-index:1000;color:white;font-family:monospace;min-width:320px;';
        devConsole.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:14px;color:#2980b9;">DEV CONSOLE</span>
                <button id="devCloseBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">✕</button>
            </div>
            <div id="devOutput" style="background:#111;padding:8px;height:120px;overflow-y:auto;font-size:12px;margin-bottom:10px;border:1px solid #333;"></div>
            <input id="devInput" type="text" placeholder="dev.setCurrency(1000)" style="width:100%;padding:6px;background:#111;color:#0f0;border:1px solid #555;box-sizing:border-box;font-family:monospace;">
        `;
        document.body.appendChild(devConsole);
        const output = devConsole.querySelector('#devOutput');
        function log(msg, color = '#aaa') {
            const line = document.createElement('div');
            line.style.color = color;
            line.textContent = msg;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        }
        // login logic
        devBtn.addEventListener('click', () => {
            if (devUnlocked) {
                devConsole.style.display = devConsole.style.display === 'none' ? 'block' : 'none';
            } else {
                loginModal.style.display = 'block';
                loginModal.querySelector('#devPassword').value = '';
                loginModal.querySelector('#devLoginError').style.display = 'none';
            }
        });
        //#region SERVER AUTH
        const USE_SERVER_AUTH = true; // flip to true when PHP is ready
        const AUTH_ENDPOINT = 'http://localhost/paintlaunch/auth.php';

        loginModal.querySelector('#devLoginBtn').addEventListener('click', async () => {
            const pw = loginModal.querySelector('#devPassword').value;
            const errorEl = loginModal.querySelector('#devLoginError');

            if (USE_SERVER_AUTH) {
                try {
                    const res = await fetch(AUTH_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: pw })
                    });
                    const data = await res.json();
                    if (data.success) {
                        devUnlocked = true;
                        loginModal.style.display = 'none';
                        devConsole.style.display = 'block';
                        log('dev console unlocked via server', '#2980b9');
                    } else {
                        errorEl.textContent = data.message || 'incorrect password';
                        errorEl.style.display = 'block';
                    }
                } catch (err) {
                    errorEl.textContent = 'server unreachable';
                    errorEl.style.display = 'block';
                }
            } else {
                errorEl.textContent = 'server auth required';
                errorEl.style.display = 'block';
            }
        });
        //#endregion
        loginModal.querySelector('#devPassword').addEventListener('keydown', e => {
            if (e.key === 'Enter') loginModal.querySelector('#devLoginBtn').click();
        });
        loginModal.querySelector('#loginCloseBtn').addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
        devConsole.querySelector('#devCloseBtn').addEventListener('click', () => {
            devConsole.style.display = 'none';
            devUnlocked = false;
        });
        // dev input execution
        devConsole.querySelector('#devInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const cmd = e.target.value.trim();
                if (!cmd) return;
                log('> ' + cmd, '#fff');
                try {
                    const result = new Function('dev', `return ${cmd}`)(window.dev);
                    log(result !== undefined ? String(result) : 'ok', '#0f0');
                } catch (err) {
                    log(err.message, '#f55');
                }
                e.target.value = '';
            }
        });
    }
    function createAuthPanel() {
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid white;padding:24px;z-index:1000;color:white;font-family:monospace;min-width:280px;';
        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
                <span id="authTitle" style="font-size:16px;">SIGN IN</span>
                <button id="authCloseBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">✕</button>
            </div>
            <input id="authUsername" type="text" placeholder="username" style="width:100%;padding:6px;background:#111;color:#fff;border:1px solid #555;margin-bottom:8px;box-sizing:border-box;font-family:monospace;">
            <input id="authPassword" type="password" placeholder="password" style="width:100%;padding:6px;background:#111;color:#fff;border:1px solid #555;margin-bottom:12px;box-sizing:border-box;font-family:monospace;">
            <div style="display:flex;gap:8px;margin-bottom:8px;">
                <button id="authLoginBtn" style="flex:1;padding:8px;background:#2980b9;color:white;border:none;cursor:pointer;font-family:monospace;">LOGIN</button>
                <button id="authRegisterBtn" style="flex:1;padding:8px;background:#27ae60;color:white;border:none;cursor:pointer;font-family:monospace;">REGISTER</button>
            </div>
            <button id="authLogoutBtn" style="display:none;width:100%;padding:8px;background:#c0392b;color:white;border:none;cursor:pointer;font-family:monospace;margin-bottom:8px;">LOGOUT</button>
            <div id="authMessage" style="font-size:12px;margin-top:4px;min-height:16px;"></div>
        `;
        document.body.appendChild(modal);

        function setMessage(msg, color = '#f55') {
            modal.querySelector('#authMessage').style.color = color;
            modal.querySelector('#authMessage').textContent = msg;
        }

        function setLoggedInState() {
            modal.querySelector('#authUsername').style.display = 'none';
            modal.querySelector('#authPassword').style.display = 'none';
            modal.querySelector('#authLoginBtn').style.display = 'none';
            modal.querySelector('#authRegisterBtn').style.display = 'none';
            modal.querySelector('#authLogoutBtn').style.display = 'block';
            modal.querySelector('#authTitle').textContent = 'HI, ' + playerAuth.username.toUpperCase();
            setMessage('logged in', '#0f0');
        }

        function setLoggedOutState() {
            modal.querySelector('#authUsername').style.display = 'block';
            modal.querySelector('#authPassword').style.display = 'block';
            modal.querySelector('#authLoginBtn').style.display = 'block';
            modal.querySelector('#authRegisterBtn').style.display = 'block';
            modal.querySelector('#authLogoutBtn').style.display = 'none';
            modal.querySelector('#authTitle').textContent = 'SIGN IN';
            setMessage('');
        }

        // LOGIN
        modal.querySelector('#authLoginBtn').addEventListener('click', async () => {
            const username = modal.querySelector('#authUsername').value.trim();
            const password = modal.querySelector('#authPassword').value;
            if (!username || !password) { setMessage('fill in all fields'); return; }
            setMessage('logging in...', '#aaa');

            // TODO: implement POST to your login endpoint
            // expected request:  { username, password }
            // expected response: { success: true, token: '...', username: '...' }
            //                 or { success: false, message: '...' }
            try {
                const res = await fetch('http://localhost/paintlaunch/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    playerAuth.loggedIn = true;
                    playerAuth.username = data.username;
                    playerAuth.token = data.token;
                    setLoggedInState();
                    loadPlayerData();
                } else {
                    setMessage(data.message || 'login failed');
                }
            } catch (err) {
                setMessage('server unreachable');
            }
        });

        // REGISTER
        modal.querySelector('#authRegisterBtn').addEventListener('click', async () => {
            const username = modal.querySelector('#authUsername').value.trim();
            const password = modal.querySelector('#authPassword').value;
            if (!username || !password) { setMessage('fill in all fields'); return; }
            setMessage('registering...', '#aaa');

            // TODO: implement POST to your register endpoint
            // expected request:  { username, password }
            // expected response: { success: true, token: '...', username: '...' }
            //                 or { success: false, message: '...' }
            try {
                const res = await fetch('http://localhost/paintlaunch/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    playerAuth.loggedIn = true;
                    playerAuth.username = data.username;
                    playerAuth.token = data.token;
                    setLoggedInState();
                    loadPlayerData();
                } else {
                    setMessage(data.message || 'registration failed');
                }
            } catch (err) {
                setMessage('server unreachable');
            }
        });

        // LOGOUT
        modal.querySelector('#authLogoutBtn').addEventListener('click', () => {
            playerAuth.loggedIn = false;
            playerAuth.username = null;
            playerAuth.token = null;
            setLoggedOutState();
        });

        modal.querySelector('#authCloseBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        if (playerAuth.loggedIn) setLoggedInState();

        window.authModal = modal;
    }
    createAuthPanel();
    createDevPanel();
    //#endregion

    let lastTime = 0;
    let enemyTimer = 0;
    let enemyInterval = 1000;
    let randomEnemyInterval = Math.random() * 1000 + 500;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const threshold = canvas.height * (1/3);
        const gridSize = canvas.height / 3;
        const deadZone = 20;
        if (player.y < threshold - deadZone) {
            targetCameraY = Math.floor((threshold - player.y) / gridSize) * gridSize;
        } else if (player.y > threshold + deadZone) {
            targetCameraY = 0;
        }
        cameraY += (targetCameraY - cameraY) * 0.1;

        ctx.save();
        ctx.translate(0, cameraY);
        background.draw(ctx);
        if (gameStart) {
            background.update(player.speed);
            player.draw(ctx);
            player.update(deltaTime, enemies, background.height);
            handleEnemies(deltaTime);
        }
        if (barrel) {barrel.draw(ctx); barrel.update(input); drawTrajectory(ctx);}
        if (cannon) {cannon.draw(ctx, barrel ? barrel.x : -9999);}
        if (barrel && !barrel.active) barrel = null;
        if (cannon && !cannon.active) cannon = null;
        if (boostFlash > 0) {
            const alpha = boostFlash / 10 * 0.25;
            ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
            ctx.fillRect(-canvas.width, -canvas.height, canvas.width * 3, canvas.height * 3);
            boostFlash--;
        }
        if (hitFlash > 0) {
            const alpha = hitFlash / 20 * 0.4;
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.fillRect(-canvas.width, -canvas.height, canvas.width * 3, canvas.height * 3);
            hitFlash--;
        }
        ctx.restore();
        displayStatusText(ctx);
        drawShop(ctx);
        drawInventory(ctx);
        drawAimingOverlay(ctx);
        if (!gameReady) drawStartScreen(ctx);
        setTimeout(() => {
            if (!gameOver) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.translate(0, cameraY);
                boostFlash = 0;
                hitFlash = 0;
                background.draw(ctx);
                player.draw(ctx);
                ctx.restore();
                displayStatusText(ctx);
            }
        }, 1000 / 60);
    }
    animate(0);
});