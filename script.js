window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;
    canvas.height = 720;
    let cameraY = 0;
    let targetCameraY = 0;
    let enemies = [];
    let aerialEnemyTimer = 0;
    let aerialEnemyInterval = 500;
    let randomAerialInterval = Math.random() * 500 + 250;
    let score = 0;
    let highScore = 0;
    let lives = 3;
    let gameOver = false;
    let gameStart = false;
    let shopOpen = false;
    let currency = 0;
    let lastCoinScore = 0;
    let upgrades = { power: 0, speed: 0 };
    let cosmetics = { skin: 0 };

    const shopItems = {
        cannon: [
            {
                label: 'Blue Paint',
                desc: 'A cool blue cannon',
                cost: 500,
                owned: false,
                onBuy: () => {
                    cosmetics.cannonPaint = 'blue';
                    cannon.image = document.getElementById('blueCannon');
                    barrel.image = document.getElementById('blueBarrel');
                    player.image = document.getElementById('playerBlue');
                    upgrades.power = 5;
                    upgrades.speed = 1;
                }
            },
            {
                label: 'Red Paint',
                desc: 'A fiery red cannon',
                cost: 2000,
                owned: false,
                onBuy: () => {
                    cosmetics.cannonPaint = 'red';
                    cannon.image = document.getElementById('redCannon');
                    barrel.image = document.getElementById('redBarrel');
                    player.image = document.getElementById('playerRed');
                    upgrades.power = 15;
                    upgrades.speed = 3;
                }
            },
            {
                label: 'Gold Paint',
                desc: 'A prestigious gold cannon',
                cost: 8000,
                owned: false,
                onBuy: () => {
                    cosmetics.cannonPaint = 'gold';
                    cannon.image = document.getElementById('goldCannon');
                    barrel.image = document.getElementById('goldBarrel');
                    player.image = document.getElementById('playerGold');
                    upgrades.power = 35;
                    upgrades.speed = 8;
                }
            },
            {
                label: 'Neon Paint',
                desc: 'A flashy neon cannon',
                cost: 30000,
                owned: false,
                onBuy: () => {
                    cosmetics.cannonPaint = 'neon';
                    cannon.image = document.getElementById('neonCannon');
                    barrel.image = document.getElementById('neonBarrel');
                    player.image = document.getElementById('playerNeon');
                    upgrades.power = 70;
                    upgrades.speed = 18;
                }
            },
        ],
        player: [
            {
                label: 'Alt Skin',
                desc: 'Different player skin',
                cost: 1000,
                owned: false,
                onBuy: () => { cosmetics.skin = 1; }
            },
        ],
        boost: [
            {
                label: 'Extra Boost',
                desc: '+1 boost per run',
                cost: 750,
                owned: false,
                repeatable: true,
                onBuy: () => { player.boosts++; }
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
                    if (gameOver) {
                        const rect = canvas.getBoundingClientRect();
                        const mx = e.clientX - rect.left;
                        const my = e.clientY - rect.top;
                        if (mx > canvas.width/2 - 100 && mx < canvas.width/2 + 100 && my > 550 && my < 610) {
                            reset();
                        }
                        return;
                    }
                    if (gameStart) return; // shop only in aiming phase
                    const rect = canvas.getBoundingClientRect();
                    const mx = e.clientX - rect.left;
                    const my = e.clientY - rect.top;
                    if (mx > canvas.width - 120 && mx < canvas.width - 20 && my > 70 && my < 120) {
                        shopOpen = !shopOpen;
                    }
                    if (shopOpen) {
                        const wx = canvas.width/2 - 300;
                        const wy = canvas.height/2 - 200;
                        const ww = 600;
                        const colW = ww / 3;

                        // close button
                        if (mx > wx + ww - 40 && mx < wx + ww && my > wy && my < wy + 40) {
                            shopOpen = false;
                        }

                        // buy buttons
                        const cols = ['cannon', 'player', 'boost'];
                        cols.forEach((key, ci) => {
                            shopItems[key].forEach((item, i) => {
                                const itemX = wx + ci * colW + 10;
                                const itemW = colW - 20;
                                const iy = wy + 110 + i * 90;
                                const bx = itemX + itemW/2 - 35;
                                if (mx > bx && mx < bx + 70 && my > iy + 46 && my < iy + 70) {
                                    if (currency >= item.cost && (!item.owned || item.repeatable)) {
                                        currency -= item.cost;
                                        if (!item.repeatable) item.owned = true;
                                        item.onBuy();
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
            const pivotY = this.y + this.height/this.width;
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
        update(deltaTime, enemies) {
            if (this.justLaunched) {
                this.justLaunched = false;
                input.clicked = false; // discard any click that happened on launch frame
            }
            // boost logic
            if (this.launched && input.clicked && this.boosts > 0) {
                const power = this.boostPower || 1;
                this.vy -= 25 * power;
                this.speed += 5 * power;
                this.boosts--;
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
                        if (lives <= 0) gameOver = true;
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
            if (this.launched && this.speed < 1) {
                gameOver = true;
            }
            // vertical movement
            this.y += this.vy;
            if (!this.onGround()) {
                if (this.vy >= 0 && !this.peakReached) this.peakReached = true;
                const bgHeight = background.height;
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
                offscreen.height = this.height;
                offscreen.getContext('2d').drawImage(layer.image, 0, 0);
                layer.offscreen = offscreen;
            });
        }
        draw(context) {
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
            this.width = 120 * scale;
            this.height = 100 * scale;
            this.image = document.getElementById('enemy2Image');
            this.maxFrame = 5;
            this.speed = 12;
            this.y = player.y - Math.random() * 600;
        }
        draw(context) {
            context.drawImage(this.image, this.frameX * 120, 0, 120, 100, this.x, this.y, this.width, this.height);
        }
    }

    class Enemy3 extends Enemy {
        constructor(gameWidth, gameHeight) {
            super(gameWidth, gameHeight);
            this.width = 200 * scale;
            this.height = 150 * scale;
            this.image = document.getElementById('enemy3Image');
            this.maxFrame = 5;
            this.speed = 5;
            this.y = player.y - Math.random() * 600;
        }
        draw(context) {
            context.drawImage(this.image, this.frameX * 200, 0, 200, 150, this.x, this.y, this.width, this.height);
        }
    }

    function drawTrajectory(context) {
        if (gameStart || !barrel) return;
        const exit = barrel.getExit();
        const power = 10 + barrel.charge * 0.3 + upgrades.power;
        const radians = barrel.angle * Math.PI / 180;
        let vx = Math.cos(radians) * power + upgrades.speed;
        let vy = Math.sin(radians) * power;
        let x = exit.x;
        let y = exit.y + 55;
        const ratio = this.charge / 100;
        const r = Math.floor(255 * Math.min(ratio * 2, 1));
        const g = Math.floor(255 * Math.min((1 - ratio) * 2, 1));

        context.save();
        context.setLineDash([6, 6]);
        context.strokeStyle = `rgb(${r},${g},0)`;
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
        if (gameStart) return;
        // currency above shop button
        context.font = '22px PixelOperator';
        context.fillStyle = 'gold';
        context.textAlign = 'right';
        context.fillText('Coins: ' + currency, canvas.width - 20, 40);
        // shop button
        context.fillStyle = 'rgba(0,0,0,0.6)';
        context.fillRect(canvas.width - 120, 70, 100, 50);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.strokeRect(canvas.width - 120, 70, 100, 50);
        context.font = '22px PixelOperator';
        context.fillStyle = 'white';
        context.textAlign = 'left';
        context.fillText('SHOP', canvas.width - 109, 105);
        if (!shopOpen) return;

        // overlay
        context.fillStyle = 'rgba(0,0,0,0.75)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // window
        const wx = canvas.width/2 - 300;
        const wy = canvas.height/2 - 200;
        const ww = 600;
        const wh = 440;
        context.fillStyle = '#1a1a2e';
        context.fillRect(wx, wy, ww, wh);
        context.strokeStyle = 'white';
        context.lineWidth = 2;
        context.strokeRect(wx, wy, ww, wh);

        // title
        context.font = '28px PixelOperator';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText('SHOP', canvas.width/2, wy + 36);
        context.font = '18px PixelOperator';
        context.fillStyle = 'gold';
        context.fillText('Coins: ' + currency, canvas.width/2, wy + 60);

        // columns
        const cols = ['cannon', 'player', 'boost'];
        const colLabels = ['Cannon', 'Player', 'Boost'];
        const colW = ww / 3;

        cols.forEach((key, ci) => {
            const colX = wx + ci * colW + colW / 2;
            // column header
            context.font = '18px PixelOperator';
            context.fillStyle = 'rgba(255,255,255,0.5)';
            context.textAlign = 'center';
            context.fillText(colLabels[ci], colX, wy + 90);

            shopItems[key].forEach((item, i) => {
                const iy = wy + 110 + i * 90;
                const itemX = wx + ci * colW + 10;
                const itemW = colW - 20;

                context.fillStyle = item.owned && !item.repeatable ? 'rgba(0,200,0,0.15)' : 'rgba(255,255,255,0.07)';
                context.fillRect(itemX, iy, itemW, 75);
                context.strokeStyle = item.owned && !item.repeatable ? 'rgba(0,200,0,0.5)' : 'rgba(255,255,255,0.2)';
                context.strokeRect(itemX, iy, itemW, 75);

                // label
                context.fillStyle = 'white';
                context.font = '14px PixelOperator';
                context.textAlign = 'center';
                context.fillText(item.label, colX, iy + 20);

                // desc
                context.fillStyle = 'rgba(255,255,255,0.6)';
                context.font = '12px PixelOperator';
                context.fillText(item.desc, colX, iy + 38);

                // buy button
                const bx = itemX + itemW/2 - 35;
                context.fillStyle = item.owned && !item.repeatable ? '#27ae60' : currency >= item.cost ? '#2980b9' : '#555';
                context.fillRect(bx, iy + 46, 70, 24);
                context.fillStyle = 'white';
                context.font = '14px PixelOperator';
                context.fillText(item.owned && !item.repeatable ? 'OWNED' : item.cost + 'c', colX, iy + 63);
            });
        });

        // close button
        context.fillStyle = '#c0392b';
        context.fillRect(wx + ww - 40, wy, 40, 40);
        context.fillStyle = 'white';
        context.font = '24px PixelOperator';
        context.textAlign = 'center';
        context.fillText('X', wx + ww - 20, wy + 28);
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

    function displayStatusText(context) {
        score += Math.floor(player.distance / 100) || 0 ;
        if (!gameOver) {
            context.font = '40px PixelOperator';
            context.fillStyle = 'black';
            context.fillText('Score: ' + score, 20, 50);
            context.fillStyle = 'white';
            context.fillText('Score: ' + score, 22, 52);
            context.font = '40px PixelOperator';
            context.fillStyle = 'black';
            context.fillText('Score: ' + score, 20, 50);
            context.fillStyle = 'white';
            context.fillText('Score: ' + score, 22, 52);
            context.fillStyle = 'black';
            // lives text
            context.font = '30px PixelOperator';
            context.fillText('Lives: ' + lives, 20, 100);
            context.fillStyle = 'white';
            context.fillText('Lives: ' + lives, 22, 102);
            const dist = Math.floor(player.distance / 100) || 0;
        }
        else {
            if (score > highScore) highScore = score;
            const milestone = Math.floor(score / 1000);
            if (milestone > lastCoinScore) {
                currency += (milestone - lastCoinScore) * 1;
                lastCoinScore = milestone;
            }
            context.font = '45px PixelOperator';
            context.textAlign = 'center';
            context.fillStyle = 'black';
            context.fillText('GAME OVER!', canvas.width/2, 200);
            context.fillStyle = 'white';
            context.fillText('GAME OVER!', canvas.width/2 + 2, 202);
            context.font = '35px PixelOperator';
            // coins
            context.fillStyle = 'black';
            context.fillText('COINS: +' + currency, canvas.width/2, 300);
            context.fillStyle = 'white';
            context.fillText('COINS: +' + currency, canvas.width/2 + 2, 302);
            // score
            context.font = '30px PixelOperator';
            context.fillStyle = 'black';
            context.fillText('SCORE: ' + score, canvas.width/2, 400);
            context.fillStyle = 'white';
            context.fillText('SCORE: ' + score, canvas.width/2 + 2, 402);
            context.fillStyle = 'black';
            context.fillText('HIGH SCORE: ' + highScore, canvas.width/2, 500);
            context.fillStyle = 'white';
            context.fillText('HIGH SCORE: ' + highScore, canvas.width/2 + 2, 502);
            // play again button
            context.fillStyle = '#2980b9';
            context.fillRect(canvas.width/2 - 100, 550, 200, 60);
            context.strokeStyle = 'white';
            context.lineWidth = 2;
            context.strokeRect(canvas.width/2 - 100, 550, 200, 60);
            context.fillStyle = 'white';
            context.font = '20px PixelOperator';
            context.fillText('PLAY AGAIN', canvas.width/2, 590);
        }
    }

    function reset() {
        score = 0;
        lastCoinScore = 0;
        lives = 3;
        player.boosts = 3;
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
        if (cosmetics.cannonPaint) {
            const p = cosmetics.cannonPaint;
            cannon.image = document.getElementById(p + 'Cannon');
            barrel.image = document.getElementById(p + 'Barrel');
            player.image = document.getElementById('player' + p.charAt(0).toUpperCase() + p.slice(1));
            const activeItem = shopItems.cannon.find(item => item.label.toLowerCase().startsWith(p));
            if (activeItem) activeItem.onBuy();
        }
        requestAnimationFrame(animate);
    }

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
    const DEV_PASSWORD = 'codeBlooded';
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
        const USE_SERVER_AUTH = false; // flip to true when PHP is ready
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
                if (pw === DEV_PASSWORD) {
                    devUnlocked = true;
                    loginModal.style.display = 'none';
                    devConsole.style.display = 'block';
                    log('dev console unlocked', '#2980b9');
                } else {
                    errorEl.textContent = 'incorrect password';
                    errorEl.style.display = 'block';
                }
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
            player.update(deltaTime, enemies);
            handleEnemies(deltaTime);
        }
        if (barrel) {barrel.draw(ctx); barrel.update(input); drawTrajectory(ctx);}
        if (cannon) {cannon.draw(ctx, barrel ? barrel.x : -9999);}
        if (barrel && !barrel.active) barrel = null;
        if (cannon && !cannon.active) cannon = null;
        ctx.restore();
        displayStatusText(ctx);
        drawShop(ctx);
        setTimeout(() => {
            if (!gameOver) requestAnimationFrame(animate);
            else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.translate(0, cameraY);
                background.draw(ctx);
                player.draw(ctx);
                ctx.restore();
                displayStatusText(ctx);
            }
        }, 1000 / 60);
    }
    animate(0);
});