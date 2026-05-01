# Paint Launch — Comprehensive Code Reference

## Project Overview

Paint Launch is a canvas-based browser game where a player character is launched from a cannon and travels as far as possible before losing speed. The game features a shop, inventory, parallax backgrounds, enemy types, a leaderboard, and player authentication.

---

## File Structure

```
htdocs/paintlaunch/
    index.html          — HTML shell, loads all image assets and script
    script.js           — All game logic (single file)
    styles.css          — Canvas centering and body styles
    auth.php            — Dev console password auth (already built)
    save.php            — TODO: save player data
    load.php            — TODO: load player data
    login.php           — TODO: player login
    register.php        — TODO: player registration
    highscore.php       — TODO: submit high score
    leaderboard.php     — TODO: fetch top 3 scores
    images/
        paintboy/       — Player sprite sheets (player-base, player-blue, etc.)
        cannons/        — Cannon and barrel sprites (base, blue, red, gold, neon)
        enemies/        — Enemy sprite sheets (enemy_1, enemy_2)
        background/     — Parallax background layers (bg1-bg6)
```

---

## State Variables

| Variable | Type | Description |
|---|---|---|
| `gameReady` | bool | False until player clicks PLAY on start screen |
| `gameStart` | bool | True after cannon fires |
| `gameOver` | bool | True when lives reach 0 or speed drops to 0 on ground |
| `score` | int | Current run score, increases with distance and enemies passed |
| `highScore` | int | Best score across all runs |
| `lives` | int | Current lives remaining |
| `baseLives` | int | Permanent lives (persists across runs) |
| `baseBoosts` | int | Permanent boost count (persists across runs) |
| `currency` | int | Coins for the shop |
| `cameraY` | float | Current smoothed camera offset |
| `targetCameraY` | float | Snapped camera target |
| `upgrades` | object | { power, speed } cannon tier bonuses |
| `cosmetics` | object | { cannonPaint } active skin key |
| `inventory` | object | { cannons: [...], activeCannon } |
| `playerAuth` | object | { loggedIn, username, token } |
| `shopOpen` | bool | Shop modal visibility |
| `inventoryOpen` | bool | Inventory modal visibility |
| `leaderboard` | array | Top 3 scores fetched from server |
| `hitFlash` | int | Countdown for red screen flash on hit |
| `boostFlash` | int | Countdown for yellow screen flash on boost |
| `lastScoredDistance` | int | Tracks distance milestones to prevent score double-counting |

---

## Classes

### InputHandler
Listens to keyboard and mouse events.
- Arrow keys — barrel angle
- Space held — charge meter oscillates
- Space released — fires cannon, sets gameStart = true
- Mouse click — boost mid-flight (if boosts > 0), shop/inventory interactions

### Cannon
Draws the cannon base image. Positioned relative to the barrel. Scrolls off screen after launch and deactivates.

### Barrel
- Rotates based on arrow key input (angle clamped to -60 to 0 degrees)
- Draws the charge meter (color shifts green to red as charge increases)
- On space release: sets player.power, calls player.launch(angle), sets gameStart = true
- getExit() calculates the barrel tip position for player spawn and trajectory drawing

### Player
- width/height are 200 * scale (scale = 0.5)
- launch(angle) sets speed and vy from angle and power
- update(deltaTime, enemies, bgHeight):
  - Boost logic clamps vy to 0 before applying upward boost
  - Collision detection: Enemy3 bounces, others reduce lives
  - Sprite animation: ground frames vs air frames
  - Horizontal decay: 0.99 on ground, 0.99999 in air
  - Vertical gravity: scales down past 50% background height, stalls at peak
  - Game over triggers when speed < 1 AND on ground
- justLaunched flag discards accidental click on the launch frame

### Background
- 6 parallax layers, each pre-rendered to an offscreen canvas on load
- Each layer has speedX and speedY (layer 1 = 0.1, layer 6 = 1.0)
- Horizontal scroll driven by player.speed
- Vertical scroll driven by cameraY
- Original images freed from memory after offscreen draw

### Enemy (base class)
- Spawns at right edge at ground level
- Moves left at this.speed + player.speed
- Increments score when it passes off the left edge

### Enemy2 (extends Enemy)
- Smaller, faster (speed 12)
- Spawns at random y above player
- Damages player on contact

### Enemy3 (extends Enemy)
- Larger, slower (speed 5)
- Spawns at random y above player
- Does NOT damage player, instead bounces them:
  - Hit top third: player launches up and forward
  - Hit bottom third: player launches down and forward
  - Hit middle: player gets forward boost only

---

## Key Functions

### applyCannonSkin(p)
Applies a cannon paint tier. Sets cannon/barrel/player images and upgrades stats.

| Tier | power | speed |
|---|---|---|
| base | 0 | 0 |
| blue | 5 | 1 |
| red | 15 | 3 |
| gold | 35 | 8 |
| neon | 70 | 18 |

Also calls savePlayerData() after applying.

### drawText(context, text, x, y, font, color, align)
All text uses this helper. Draws a black stroke outline then fills with the given color, ensuring legibility on both light and dark backgrounds.

### displayStatusText(context)
- During play: score, lives, boost squares, leaderboard
- On game over: score, best, coins earned, leaderboard, play again button
- Handles coin awarding from score milestones
- Handles high score upload to server

### reset()
Resets all run state. Preserves: currency, highScore, baseLives, baseBoosts, inventory, upgrades, boostPower, shop ownership. Calls applyCannonSkin to restore active skin.

### handleEnemies(deltaTime)
Two independent spawn timers: one for ground enemies (Enemy), one for aerial (Enemy2/Enemy3). Aerial enemies spawn more frequently.

### drawTrajectory(context)
Simulates the launch arc in real time using the same physics as the player (weight, speed decay). Color matches the charge meter.

### drawStartScreen(context)
Shown on page load. Overlay with title, PLAY button, and controls list. Dismissed by clicking PLAY.

### drawAimingOverlay(context)
Shown during the aiming phase (after PLAY, before launch). Displays control hints at the bottom of the screen.

### savePlayerData()
Serializes all persistent player state and POSTs to save.php. Only runs if logged in.

### loadPlayerData()
GETs saved data from load.php using the session token. Restores all state and re-applies active cannon skin. Called after login and register.

### fetchLeaderboard()
GETs top 3 scores from leaderboard.php. Called on load (with 2s delay) and after a new high score is set.

---

## Shop System

shopItems is an object with three categories: cannon, player, boost.

Each item has:
- label: display name
- desc: description
- cost: coin cost
- owned: for non-repeatable items
- repeatable: if true, can be bought multiple times, never shows OWNED
- onBuy(): effect function

### Cannon items (unlock and equip skin tier):
- Blue Paint: 500c
- Red Paint: 2000c
- Gold Paint: 8000c
- Neon Paint: 30000c

### Player items:
- Extra Life: 500c, +1 life this run
- More Life: 1000c, +1 life permanently

### Boost items:
- Extra Boost (temp): 250c, +1 boost this run
- Extra Boost (perm): 750c, +1 boost permanently (baseBoosts++)
- Boost Power: 1500c, +0.5x boost multiplier (stacks)

---

## Inventory System

inventory.cannons is an array of owned skin keys (always includes 'base'). The inventory panel renders a slot per owned cannon. Clicking a slot calls applyCannonSkin(key).

---

## Camera System

The camera snaps vertically in gridSize steps when the player passes the 1/3 height threshold, then lerps smoothly toward the target using cameraY += (targetCameraY - cameraY) * 0.1. All world elements draw inside ctx.translate(0, cameraY). UI elements draw outside this translate.

---

## Gravity System

After the player reaches the arc peak (peakReached = true):
- A stall zone activates above 50% background height: vy dampens to near zero for stallDuration frames (scales 1s to 9s based on height)
- After stall, gravity is scaled down based on height and current speed
- Boosting resets peakReached so the arc restarts naturally

---

## Dev Console

Accessible via the DEV button (bottom right). Requires server auth via auth.php. Signs out on close.

Available commands:
```
setCurrency(v)      set currency
setLives(v)         set lives
setScore(v)         set score
setUpgrade(k, v)    set upgrades.power or upgrades.speed
addBoosts(v)        add boosts
setBoostPower(v)    set boostPower multiplier
```

---

## PHP Endpoints Required

| File | Method | Purpose |
|---|---|---|
| auth.php | POST | Dev console password check (already built) |
| login.php | POST | Player login, returns token |
| register.php | POST | Player registration, returns token |
| save.php | POST | Save all player data by token |
| load.php | GET | Load player data by token |
| highscore.php | POST | Submit new high score |
| leaderboard.php | GET | Return top 3 scores |

See script_todos.js for exact request and response shapes for each endpoint.

---

## Suggested Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE player_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    currency INT DEFAULT 0,
    high_score INT DEFAULT 0,
    base_lives INT DEFAULT 3,
    base_boosts INT DEFAULT 3,
    boost_power FLOAT DEFAULT 1,
    upgrades JSON,
    inventory JSON,
    shop_items JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score INT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Setup

1. Clone into C:/xampp/htdocs/paintlaunch/
2. Start Apache and MySQL in XAMPP
3. Run the SQL above in phpMyAdmin
4. Run the dev_users SQL from the original README for the dev console password
5. Open http://localhost/paintlaunch
6. Implement the PHP endpoints listed above - see DEV_README/script_todos.js for exact specs
