import GUN from 'gun';
import 'gun/sea';
import 'gun/axe';
import { writable } from 'svelte/store';

// Database
export const db = GUN();

const REMEMBER_KEY = 'shoot.rememberLogin';

// Gun User
export const user = db.user();

function getRememberPreference() {
    try {
        return window.localStorage.getItem(REMEMBER_KEY) === '1';
    } catch (e) {
        return false;
    }
}

function applyRecallMode(remember) {
    user.recall({ sessionStorage: !remember, localStorage: remember });
}

export const rememberLogin = writable(getRememberPreference());
applyRecallMode(getRememberPreference());

export function setRememberLogin(remember) {
    const rememberEnabled = !!remember;

    try {
        window.localStorage.setItem(REMEMBER_KEY, rememberEnabled ? '1' : '0');
    } catch (e) {
        // Ignore storage write issues and continue with in-memory behavior.
    }

    rememberLogin.set(rememberEnabled);
    applyRecallMode(rememberEnabled);
}

export function touchUserIndex(alias, isSignup = false) {
    if (!alias) return;

    const now = Date.now();
    const payload = {
        alias,
        lastSeen: now,
    };

    if (isSignup) {
        payload.createdAt = now;
    }

    db.get('userIndex').get(alias).put(payload);
}

// Current User's username
export const username = writable('');
export const userAvatar = writable('');

user.get('alias').on(v => username.set(v))
user.get('avatar').on(v => userAvatar.set(v))

db.on('auth', async(event) => {
    const alias = await user.get('alias'); // username string
    username.set(alias);
    touchUserIndex(alias, false);

    console.log(`signed in as ${alias}`);
});