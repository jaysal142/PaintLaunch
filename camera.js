const root = document.getElementById("game-root");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const reset = document.getElementById("reset");
const cbaseImg = new Image();
const cbarrelImg = new Image();
const pbImg = new Image();

canvas.width = root.getBoundingClientRect().width;
canvas.height = 400;

const worldWidth = 3000;
const groundY = 350;

const gravity = 980;

const projectile = {
    x: 100,
    y: groundY,
    vx: 0,
    vy: 0,
    radius: 20,
    launched: false,
    rotation: 0
};

const cannon = {
    x: 100,
    y: groundY,
    angle: 45,
    minAngle: 10,
    maxAngle: 80,
    power: 0,
    maxPower: 1200,
    chargeSpeed: 1000,
    charging: false
}

const cCosmetics = {
    barrelImage: "images/cannons/base-b.png",
    baseImage: "images/cannons/base-c.png",
    pbImage: "images/paintboy/base-pb.png"
}

const camera = {
    x: 0,
    y: 0
};

function fireCannon() {
    const angleRad = cannon.angle * Math.PI / 180;

    projectile.x = cannon.x;
    projectile.y = cannon.y;

    projectile.vx = cannon.power * Math.cos(angleRad);
    projectile.vy = -cannon.power * Math.sin(angleRad);

    projectile.launched = true;
}

function update(dt) {
    cbaseImg.src = cCosmetics.baseImage;
    cbarrelImg.src = cCosmetics.barrelImage;
    pbImg.src = cCosmetics.pbImage;
    canvas.width = root.getBoundingClientRect().width;

    if (cannon.charging) {
        cannon.power += cannon.chargeSpeed * dt;
        cannon.power = Math.min(cannon.power, cannon.maxPower);
    }

    if (projectile.launched) {
        projectile.vy += gravity * dt;
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.rotation += (projectile.vx / projectile.radius) * dt;

        if (projectile.y > groundY) {
            projectile.y = groundY;
            projectile.vy = 0;
            projectile.vx = 0;
            projectile.launched = false;
            let score = projectile.x - cannon.x;
            document.getElementById("w-score").style.visibility = 'visible';
            document.getElementById("score").textContent += score.toFixed(2);
        }
    }
    // HORIZONTAL
    camera.x = projectile.x - canvas.width / 6;
    // VERTICAL
    const halfScreen = canvas.height / 2;

    if (projectile.y > groundY - halfScreen) {
        camera.y += (0 - camera.y) * 4 * dt;
    } else {
        const targetY = projectile.y - halfScreen;
        const followStrength = projectile.vy < 0 ? 5 : 2;
        camera.y += (targetY - camera.y) * followStrength * dt;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ecebe8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let power = (cannon.power / cannon.maxPower) * 300;
    document.documentElement.style.setProperty('--power', power + 'px');

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // GROUND
    ctx.fillStyle = "#ecebe8";
    ctx.fillRect(camera.x - canvas.width, groundY, canvas.width * 3, canvas.height);

    // BALL
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(pbImg, -projectile.radius, -projectile.radius, projectile.radius * 2, projectile.radius * 2);
    ctx.restore();

    // CANNON
    ctx.save();
    ctx.translate(cannon.x, cannon.y);
    ctx.rotate(-cannon.angle * Math.PI / 180);
    ctx.fillStyle = "#dee0df";
    ctx.drawImage(cbarrelImg, 0, -25, 96, 46);
    ctx.restore();
    ctx.drawImage(cbaseImg, cannon.x / 3 - 10, cannon.y - 80, 150, 150 * cbaseImg.height / cbaseImg.width);
}

let lastTime = 0;
function loop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w") {
        cannon.angle = Math.min(cannon.angle + 2, cannon.maxAngle);
    }
    if (e.key === "ArrowDown" || e.key === "s") {
        cannon.angle = Math.max(cannon.angle - 2, cannon.minAngle);
    }
});

canvas.addEventListener("mousedown", () => {
    if (projectile.x === cannon.x) {
        cannon.charging = true;
    }
});

canvas.addEventListener("mouseup", () => {
    if (cannon.charging) {
        fireCannon();
    }
    cannon.charging = false;
    cannon.power = 0;
});

function resetGame() {
    projectile.x = cannon.x;
    projectile.y = cannon.y;
    document.getElementById("w-score").style.visibility = 'hidden';
    document.getElementById("score").textContent = "SCORE: ";
};

function makeFull(type) {
    oldW = document.getElementById(type).style.width;
    document.getElementById(type).style.width = oldW + 500 + 'px';
};

function makeSmall(type) {
    document.getElementById(type).style.width = null;
};

function closeDiv(type) {
    document.getElementById(type).style.visibility = 'hidden';
    resetGame();
}

function upgradeCannon() {
    upgradeWindow = document.getElementById('w-popup');
    upgradeWindow.style.visibility = 'visible';

    document.getElementById("shop-item-1").src = '/images/cannons/blue-c.png';
};

function buyItem(item, power, charge) {
    document.getElementById(item).style.visibility = 'hidden';
    cannon.maxPower += power;
    cannon.chargeSpeed += charge;
    cCosmetics.baseImage = '/images/cannons/' + item + '-c.png';
    cCosmetics.barrelImage = '/images/cannons/' + item + '-b.png';
    cCosmetics.pbImage = '/images/paintboy/' + item + '-pb.png';
};
