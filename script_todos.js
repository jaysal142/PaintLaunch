// ============================================================
// PAINT LAUNCH — script.js
// PHP TODO comments marked with: // TODO(PHP):
// ============================================================

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
    const LEADERBOARD_FETCH_INTERVAL = 30000;

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
        cannons: ['base'],
        activeCannon: 'base'
    };

    let playerAuth = {
        loggedIn: false,
        username: null,
        token: null,
    };

    // ============================================================
    // SAVE / LOAD / LEADERBOARD — PHP endpoints needed here
    // ============================================================

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

        // TODO(PHP): Create save.php
        // Method: POST
        // Receives: saveData object (see above)
        // Should: validate token, find user by token, upsert all fields into player_data table
        // Returns: { success: true } or { success: false, message: '...' }
        fetch('http://localhost/paintlaunch/save.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        }).catch(() => {});
    }

    function loadPlayerData() {
        if (!playerAuth.loggedIn) return;

        // TODO(PHP): Create load.php
        // Method: GET
        // Receives: ?token=TOKEN as query param
        // Should: validate token, find user, return their saved data
        // Returns: {
        //   success: true,
        //   data: {
        //     currency, highScore, baseLives, baseBoosts,
        //     upgrades: { power, speed },
        //     inventory: { cannons: [...], activeCannon: '...' },
        //     boostPower,
        //     shopItems: {
        //       cannon: [{ label, owned }],
        //       player: [{ label, owned }],
        //       boost:  [{ label, owned }]
        //     }
        //   }
        // }
        // or { success: false, message: '...' }
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
        // TODO(PHP): Create leaderboard.php
        // Method: GET
        // No input required
        // Should: SELECT username, MAX(score) as score FROM scores
        //         GROUP BY user_id ORDER BY score DESC LIMIT 3
        // Returns: {
        //   success: true,
        //   scores: [
        //     { username: '...', score: 12345 },
        //     { username: '...', score: 9876 },
        //     { username: '...', score: 5432 }
        //   ]
        // }
        fetch('http://localhost/paintlaunch/leaderboard.php')
            .then(res => {
                if (!res.ok) throw new Error('server unavailable');
                return res.json();
            })
            .then(data => {
                if (data.success) leaderboard = data.scores;
            })
            .catch(() => {});
    }
    setTimeout(fetchLeaderboard, 2000);

    // ============================================================
    // HIGH SCORE UPLOAD — called in displayStatusText on game over
    // ============================================================
    // TODO(PHP): Create highscore.php
    // Method: POST
    // Receives: { token: '...', score: 12345 }
    // Should: validate token, find user, update their high score
    //         if the new score is greater than the stored one,
    //         then insert into scores table for leaderboard tracking
    // Returns: { success: true } or { success: false, message: '...' }
    // Note: this is called inside displayStatusText() when score > highScore

    // ============================================================
    // AUTH PANEL — login.php and register.php needed
    // ============================================================

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

        modal.querySelector('#authLoginBtn').addEventListener('click', async () => {
            const username = modal.querySelector('#authUsername').value.trim();
            const password = modal.querySelector('#authPassword').value;
            if (!username || !password) { setMessage('fill in all fields'); return; }
            setMessage('logging in...', '#aaa');

            // TODO(PHP): Create login.php
            // Method: POST
            // Receives: { username: '...', password: '...' }
            // Should: look up user by username, verify password_verify(),
            //         generate a session token (random_bytes + bin2hex),
            //         store token in sessions table with expiry,
            //         return token and username
            // Returns: { success: true, token: '...', username: '...' }
            //       or { success: false, message: 'invalid credentials' }
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

        modal.querySelector('#authRegisterBtn').addEventListener('click', async () => {
            const username = modal.querySelector('#authUsername').value.trim();
            const password = modal.querySelector('#authPassword').value;
            if (!username || !password) { setMessage('fill in all fields'); return; }
            setMessage('registering...', '#aaa');

            // TODO(PHP): Create register.php
            // Method: POST
            // Receives: { username: '...', password: '...' }
            // Should: check username not already taken,
            //         hash password with password_hash(),
            //         insert new user into users table,
            //         create empty player_data row for the user,
            //         generate and store session token,
            //         return token and username
            // Returns: { success: true, token: '...', username: '...' }
            //       or { success: false, message: 'username taken' }
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

        modal.querySelector('#authLogoutBtn').addEventListener('click', () => {
            // TODO(PHP): Optionally create logout.php
            // Method: POST
            // Receives: { token: '...' }
            // Should: delete token from sessions table
            // Returns: { success: true }
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

    // ============================================================
    // DEV PANEL AUTH — auth.php needed
    // ============================================================

    function createDevPanel() {
        const devBtn = document.createElement('button');
        devBtn.textContent = 'DEV';
        devBtn.style.cssText = 'position:fixed;bottom:10px;right:10px;padding:4px 8px;font-size:11px;opacity:0.4;cursor:pointer;z-index:999;background:#111;color:#fff;border:1px solid #555;';
        document.body.appendChild(devBtn);

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

        const devConsole = document.createElement('div');
        devConsole.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid #2980b9;padding:20px;z-index:1000;color:white;font-family:monospace;min-width:320px;';
        devConsole.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:14px;color:#2980b9;">DEV CONSOLE</span>
                <button id="devCloseBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">✕</button>
            </div>
            <div id="devOutput" style="background:#111;padding:8px;height:120px;overflow-y:auto;font-size:12px;margin-bottom:10px;border:1px solid #333;"></div>
            <input id="devInput" type="text" placeholder="setCurrency(1000)" style="width:100%;padding:6px;background:#111;color:#0f0;border:1px solid #555;box-sizing:border-box;font-family:monospace;">
        `;
        document.body.appendChild(devConsole);

        const output = devConsole.querySelector('#devOutput');
        let devUnlocked = false;

        function log(msg, color = '#aaa') {
            const line = document.createElement('div');
            line.style.color = color;
            line.textContent = msg;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        }

        devBtn.addEventListener('click', () => {
            if (devUnlocked) {
                devConsole.style.display = devConsole.style.display === 'none' ? 'block' : 'none';
            } else {
                loginModal.style.display = 'block';
                loginModal.querySelector('#devPassword').value = '';
                loginModal.querySelector('#devLoginError').style.display = 'none';
            }
        });

        // TODO(PHP): auth.php already exists — verify it:
        // Method: POST
        // Receives: { password: '...' }
        // Should: compare against hashed dev password in dev_users table
        // Returns: { success: true } or { success: false, message: '...' }
        const USE_SERVER_AUTH = true;
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

    createAuthPanel();
    createDevPanel();
});
