window.addEventListener('load', function() {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;
    canvas.height = 720;
    let enemies = [];
    let score = 0;
    let gameOver = false;
    let gameStart = false;

    let scale = 0.5;

    class InputHandler {
        constructor() {
            this.keys = [];
            window.addEventListener('keydown', e => {
                if ((   e.key === 'ArrowDown' || 
                        e.key === 'ArrowUp' ||
                        e.key === ' ') 
                        && this.keys.indexOf(e.key) === -1) {
                    this.keys.push(e.key);
                }
            });
            window.addEventListener('keyup', e => {
                if (    e.key === 'ArrowDown' || 
                        e.key === 'ArrowUp' ||
                        e.key === ' ') {
                    this.keys.splice(this.keys.indexOf(e.key), 1);
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
            this.image = document.getElementById('cannonImage');
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
            this.image = document.getElementById('barrelImage');
            this.cannonW = cannonW;
            this.cannonH = cannonH;
            this.angle = 0;
            this.active = true;
        }
        draw(context) {
            if (!this.active) return;
            context.save();
            context.translate(this.x, this.y + this.height/2);
            context.rotate(this.angle * Math.PI / 180);
            context.drawImage(this.image, 0, -this.height/2, this.width, this.height);
            context.restore();
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

            //input
            if (input.keys.indexOf('ArrowUp') > -1) {
                this.angle -= 2;
            } else if (input.keys.indexOf('ArrowDown') > -1) {
                this.angle += 2;
            } else if (input.keys.indexOf(' ') > -1) {
                gameStart = true;
                const exit = this.getExit();
                player.x = exit.x - player.width/2;
                player.y = exit.y - player.height/2;
                player.launch(this.angle);
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
            this.width = 100;
            this.height = 105;
            this.x = 10;
            this.y = this.gameHeight - this.height;
            this.image = document.getElementById('playerImage');
            this.frameX = 0;
            this.maxFrame = 8;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.frameY = 0;
            this.speed = 0; 
            this.vy = 0;
            this.weight = 1;
            this.power = 60;
        }
        draw(context) {
            context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
        }
        update(deltaTime, enemies) {
            // collision detection
            enemies.forEach(enemy => {
                const dx = (enemy.x + enemy.width/2) - (this.x + this.width/2);
                const dy = (enemy.y + enemy.height/2) - (this.y + this.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < enemy.width/2 + this.width/2) {
                    gameOver = true;
                }
            })
            // sprite animation
            if (this.frameTimer >= this.frameInterval) {
                if (this.frameX >= this.maxFrame) this.frameX = 0;
                else this.frameX++;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }

            // horizontal movement
            if (this.launched) this.speed *= 0.99;

            // vertical movement
            this.y += this.vy;
            if (!this.onGround()) {
                this.vy += this.weight;
                this.maxFrame = 5;
                //this.frameY = 1;
            } else {
                this.vy = 0;
                this.maxFrame = 8;
                this.frameY = 0;
            }
            if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
        }
        onGround() {
            return this.y >= this.gameHeight - this.height;
        }
        launch(angle) {
            const radians = angle * Math.PI /180;
            this.speed = Math.cos(radians) * this.power;
            this.vy = Math.sin(radians) * this.power;
            this.launched = true;
        }
    }

    class Background {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = document.getElementById('backgroundImage');
            this.x = 0;
            this.y = 0;
            this.width = 567;
            this.height = 324;
            this.speed = 10;
        }
        draw(context) {
            context.drawImage(this.image, this.x, this.y, this.width * 3, this.height * 3);
            context.drawImage(this.image, this.x + this.width * 3, this.y, this.width * 3, this.height * 3);
        }
        update(playerSpeed) {
            this.x -= playerSpeed;
            if (this.x < 0 - this.width * 3) this.x = 0;
        }
    }

    class Enemy {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 100;
            this.height = 105;
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
            context.drawImage(this.image, this.frameX * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        }
        update(deltaTime, worldSpeed) {
            if (this.frameTimer > this.frameInterval) {
                if (this.frameX >= this.maxFrame) this.frameX = 0;
                else this.frameX++;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            this.x -= this.speed + Math.max(0, worldSpeed);
            if (this.x < 0 - this.width)  {
                this.markedForDeletion = true;
                score++;
            }
        }
    }

    function handleEnemies(deltaTime) {
        if (enemyTimer > enemyInterval + randomEnemyInterval) {
            enemies.push(new Enemy(canvas.width, canvas.height));
            randomEnemyInterval = Math.random() * 1000 + 500;        
            enemyTimer = 0;
        } else {
            enemyTimer += deltaTime;
        }
        enemies.forEach(enemy => {
            enemy.draw(ctx);
            enemy.update(deltaTime, player.speed);
        });
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    }

    function displayStatusText(context) {
        context.font = '40px PixelOperator';
        context.fillStyle = 'black';
        context.fillText('Score: ' + score, 20, 50);
        context.fillStyle = 'white';
        context.fillText('Score: ' + score, 22, 52);
        if (gameOver) {
            context.textAlign = 'center';
            context.fillStyle = 'black';
            context.fillText('GAME OVER! Try Again', canvas.width/2, 200);
            context.fillStyle = 'white';
            context.fillText('GAME OVER! Try Again', canvas.width/2 + 2, 202);
        }
    }

    const input = new InputHandler();
    let cannon = new Cannon(canvas.width, canvas.height);
    let barrel = new Barrel(canvas.width, canvas.height, cannon.width, cannon.height);
    const player = new Player(canvas.width, canvas.height);
    const background = new Background(canvas.width, canvas.height);

    let lastTime = 0;
    let enemyTimer = 0;
    let enemyInterval = 1000;
    let randomEnemyInterval = Math.random() * 1000 + 500;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background.draw(ctx);
        if (gameStart) {
            background.update(player.speed);
            player.draw(ctx);
            player.update(deltaTime, enemies);
            handleEnemies(deltaTime);
            displayStatusText(ctx);
        }
        if (barrel) {barrel.draw(ctx); barrel.update(input);}
        if (cannon) {cannon.draw(ctx, barrel ? barrel.x : -9999);}
        if (barrel && !barrel.active) barrel = null;
        if (cannon && !cannon.active) cannon = null;
        setTimeout(() => {
            if (!gameOver) requestAnimationFrame(animate);
        }, 1000 / 60);
    }
    animate(0);
});