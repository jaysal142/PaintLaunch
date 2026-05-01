# Paint Launch — Dev Setup Guide

## Requirements
- [XAMPP](https://www.apachefriends.org/) installed
- Apache and MySQL running in the XAMPP control panel

---

## 1. Clone the repo

Clone into your xampp `htdocs` folder so the project is served locally:

```
C:/xampp/htdocs/paintlaunch/
```

Your folder structure should look like:
```
htdocs/paintlaunch/
    index.html
    script.js
    styles.css
    auth.php
    images/
        ...
```

---

## 2. Set up the database

1. Open your browser and go to `http://localhost/phpmyadmin`
2. Log in — default credentials are username `root`, password is blank
3. Click the **SQL** tab at the top
4. Paste the following and click **Go**:

```sql
CREATE DATABASE IF NOT EXISTS paintlaunch;
USE paintlaunch;

CREATE TABLE dev_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- default dev password is: codeBlooded
INSERT INTO dev_users (username, password_hash) 
VALUES ('dev', '$2y$10$A9IyiIXLwg5MVgSOgv9utemAFB6lwA/KD/gcXKrI5JNTWIdh4dUdq');
```

This creates the database, the table, and inserts the default dev account.

---

## 3. Enable server auth in the game

In `script.js`, find this line near the dev panel section:

```javascript
const USE_SERVER_AUTH = false;
```

Change it to:

```javascript
const USE_SERVER_AUTH = true;
```

---

## 4. Play the game

Go to `http://localhost/paintlaunch` in your browser.

---

## Dev Console

A small **DEV** button sits in the bottom right corner of the game.

- Click it to open the login window
- Default password: `codeBlooded`
- Once logged in you can run commands like:

```
setCurrency(10000)
setLives(10)
setUpgrade('power', 70)
addBoosts(5)
setBoostPower(3)
```

- Closing the console logs you out automatically

---

## Changing the dev password

To set a new password, generate a hash by creating a temporary PHP file in htdocs:

```php
<?php echo password_hash('yournewpassword', PASSWORD_DEFAULT); ?>
```

Visit it in the browser, copy the output hash, then run this in phpMyAdmin:

```sql
UPDATE dev_users SET password_hash = 'your_new_hash_here' WHERE username = 'dev';
```

Then update the local fallback in `script.js` too:

```javascript
const DEV_PASSWORD = 'yournewpassword';
```

---

## Troubleshooting

- **Blank screen / game won't load** — make sure Apache is running in XAMPP control panel
- **Auth endpoint unreachable** — make sure MySQL is running and the database was created
- **phpMyAdmin password forgotten** — check `C:/xampp/phpMyAdmin/config.inc.php` for the stored credentials
