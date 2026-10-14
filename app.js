// Tiny Fighter Arena - Pollinations QUEST #17250
// Players describe a fighter, AI brings it to life, battle with commentary
// BYOP required: users connect their own Pollinations account

const POLLINATIONS_API = 'https://gen.pollinations.ai';
const APP_KEY = 'pk_xAZVM7jPRL8AZaAz';
const REDIRECT_URI = 'https://sugamdeol.github.io/tiny-fighter-arena/';

let authToken = null;
let currentFighter = null;
let battleState = null;
let audioEnabled = false;

const $ = (sel) => document.querySelector(sel);

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function setText(el, text) { el.textContent = text; }
function setHTML(el, html) { el.innerHTML = html; }

// ---------- Auth (BYOP) ----------

function connectUrl() {
    return `https://enter.pollinations.ai/authorize?client_id=${APP_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=usage&models=text,image,audio&budget=5&expiry=7`;
}

function bindConnect() {
    const btn = $('#btn-connect');
    if (btn) btn.onclick = () => { window.location.href = connectUrl(); };
}

function checkAuth() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('api_key') || params.get('access_token');
    if (token) {
        authToken = token;
        history.replaceState(null, '', window.location.pathname);
        hide($('#auth-section'));
        show($('#create-section'));
        $('#btn-generate').disabled = false;
        logGenerateStatus('Connected! Describe a fighter and generate.');
    }
    // No token -> auth section stays visible; create section stays hidden until connect.
}

// ---------- Pollinations API ----------

async function pollinationsChat(model, systemPrompt, userPrompt) {
    const resp = await fetch(`${POLLINATIONS_API}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8
        })
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return JSON.parse(data.choices[0].message.content);
}

function fighterImageUrl(prompt) {
    return `${POLLINATIONS_API}/image/${encodeURIComponent(prompt)}?model=black-forest-labs/flux.1-schnell&width=512&height=512&key=${encodeURIComponent(authToken)}`;
}

function audioUrl(text) {
    return `${POLLINATIONS_API}/audio/${encodeURIComponent(text)}?model=openai/tts-1&voice=onyx&key=${encodeURIComponent(authToken)}`;
}

// ---------- Fighter generation ----------

const FIGHTER_SYSTEM = `You are a creative fighter designer for a battle game. Given a one-line description, create a fighter profile. Return ONLY valid JSON with exactly these fields:
{
  "name": "short fighter name",
  "title": "epithet or title",
  "appearance": "visual description for image generation, detailed, one sentence",
  "style": "fighting style description",
  "abilities": ["ability 1", "ability 2", "ability 3"],
  "personality": "brief personality",
  "hp": 100,
  "attack": 15,
  "defense": 10,
  "speed": 12
}
Constraints: hp between 90 and 120, attack between 12 and 20, defense between 8 and 16, speed between 8 and 18. Keep fighters balanced.`;

async function generateFighter(prompt) {
    const fighter = await pollinationsChat('openai/gpt-5.4-nano', FIGHTER_SYSTEM, prompt);
    // Sanitize: guarantee numbers and arrays exist
    return {
        name: String(fighter.name || 'Unknown Fighter'),
        title: String(fighter.title || 'The Nameless'),
        appearance: String(fighter.appearance || prompt),
        style: String(fighter.style || 'Brutal and direct'),
        abilities: Array.isArray(fighter.abilities) ? fighter.abilities.map(String) : ['Strike'],
        personality: String(fighter.personality || 'A mysterious contender'),
        hp: Number(fighter.hp) || 100,
        attack: Number(fighter.attack) || 15,
        defense: Number(fighter.defense) || 10,
        speed: Number(fighter.speed) || 12
    };
}

async function generateChallenger() {
    const archetypes = [
        'A hulking golem made of ancient stone and moss',
        'A swift shadow assassin with twin daggers',
        'A pyromancer wielding living flame',
        'A frost knight in eternal winter armor',
        'A void walker bending space and time',
        'A beastmaster with spectral animal companions',
        'A clockwork automaton with steam-powered fists',
        'A celestial archer shooting starlight arrows'
    ];
    const prompt = archetypes[Math.floor(Math.random() * archetypes.length)];
    return generateFighter(prompt);
}

// ---------- Battle ----------

// Each log entry carries an HP snapshot so the bars animate turn by turn.
function simulateBattle(player, enemy) {
    const log = [];
    let pHp = player.hp, eHp = enemy.hp;
    const maxP = player.hp, maxE = enemy.hp;
    let turn = 1;

    log.push({ type: 'commentary', text: `Turn ${turn}: the battle begins!`, pHp, eHp });

    while (pHp > 0 && eHp > 0 && turn <= 20) {
        // Player attacks
        const pDmg = Math.max(1, Math.round(player.attack - enemy.defense * 0.6 + (Math.random() * 6 - 3)));
        eHp = Math.max(0, eHp - pDmg);
        log.push({ type: 'player-action', text: `${player.name} hits ${enemy.name} for ${pDmg} damage!`, pHp, eHp });

        if (eHp <= 0) break;

        // Enemy attacks
        const eDmg = Math.max(1, Math.round(enemy.attack - player.defense * 0.6 + (Math.random() * 6 - 3)));
        pHp = Math.max(0, pHp - eDmg);
        log.push({ type: 'enemy-action', text: `${enemy.name} counters ${player.name} for ${eDmg} damage!`, pHp, eHp });

        turn++;
        if (pHp > 0 && eHp > 0 && turn <= 20) {
            const quips = ['A devastating blow!', 'The crowd roars!', 'What precision!', 'Steel meets steel!', 'The arena trembles!'];
            log.push({ type: 'commentary', text: quips[Math.floor(Math.random() * quips.length)], pHp, eHp });
        }
    }

    const winner = pHp > 0 ? player.name : enemy.name;
    log.push({ type: 'commentary', text: `🏆 ${winner} stands victorious!`, pHp, eHp });

    return { log, winner, playerHp: pHp, enemyHp: eHp, maxP, maxE };
}

// ---------- UI ----------

function logGenerateStatus(msg, isError = false) {
    const el = $('#generate-status');
    setText(el, msg);
    el.className = isError ? 'auth-error' : 'auth-success';
    show(el);
}

function addBattleLog(entry) {
    const log = $('#battle-log');
    const div = document.createElement('div');
    div.className = entry.type;
    div.textContent = entry.text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function updateHP(pHp, eHp, maxP, maxE) {
    const pPct = Math.max(0, Math.round((pHp / maxP) * 100));
    const ePct = Math.max(0, Math.round((eHp / maxE) * 100));
    const pFill = $('#player-hp .hp-fill');
    const eFill = $('#enemy-hp .hp-fill');
    pFill.style.width = `${pPct}%`;
    eFill.style.width = `${ePct}%`;
    pFill.textContent = `${Math.max(0, pHp)}/${maxP}`;
    eFill.textContent = `${Math.max(0, eHp)}/${maxE}`;
}

function setPlayerInfo(player) {
    setText($('#player-name'), `${player.name} — ${player.title}`);
}

function setEnemyInfo(enemy) {
    setText($('#enemy-name'), `${enemy.name} — ${enemy.title}`);
}

function displayFighter(fighter) {
    currentFighter = fighter;
    setHTML($('#fighter-text'), `
        <h3>${fighter.name}</h3>
        <p class="title">${fighter.title}</p>
        <p><strong>Style:</strong> ${fighter.style}</p>
        <p><strong>Abilities:</strong> ${fighter.abilities.join(', ')}</p>
        <p><strong>Personality:</strong> ${fighter.personality}</p>
        <div class="stats">
            HP: ${fighter.hp} | ATK: ${fighter.attack} | DEF: ${fighter.defense} | SPD: ${fighter.speed}
        </div>
    `);
    show($('#fighter-display'));
}

async function playAudio(text) {
    if (!audioEnabled) return;
    try {
        const audio = new Audio(audioUrl(text));
        await audio.play();
    } catch (e) {
        console.warn('Audio failed:', e);
    }
}

// ---------- Event handlers ----------

$('#btn-generate').onclick = async () => {
    if (!authToken) return logGenerateStatus('Connect your Pollinations account first!', true);
    const prompt = $('#fighter-input').value.trim();
    if (!prompt) return logGenerateStatus('Enter a fighter description!', true);

    $('#btn-generate').disabled = true;
    logGenerateStatus('Designing your fighter...');

    try {
        const fighter = await generateFighter(prompt);
        logGenerateStatus('Fighter designed! Generating art...');

        const img = $('#fighter-image');
        img.src = fighterImageUrl(fighter.appearance);
        img.onload = () => show(img);
        img.onerror = () => hide(img);

        if ($('#chk-voice').checked) {
            logGenerateStatus('Generating voice intro...');
            await playAudio(`Behold! ${fighter.name}, ${fighter.title}!`);
        }

        displayFighter(fighter);
        hide($('#create-section'));
        logGenerateStatus('Fighter ready! Enter the battle.');
    } catch (e) {
        logGenerateStatus(`Error: ${e.message}`, true);
    } finally {
        $('#btn-generate').disabled = false;
    }
};

$('#btn-battle').onclick = async () => {
    if (!currentFighter) return;
    hide($('#fighter-display'));
    show($('#battle-section'));
    hide($('#share-section'));

    logGenerateStatus('Summoning a challenger...');

    try {
        const enemy = await generateChallenger();
        battleState = { player: currentFighter, enemy, log: [], index: 0, result: null };

        setPlayerInfo(currentFighter);
        setEnemyInfo(enemy);
        updateHP(currentFighter.hp, enemy.hp, currentFighter.hp, enemy.hp);

        $('#battle-log').innerHTML = '';
        addBattleLog({ type: 'commentary', text: `⚔️ ${currentFighter.name} vs ${enemy.name} — let the battle begin!`, pHp: currentFighter.hp, eHp: enemy.hp });

        if (audioEnabled) {
            await playAudio(`${currentFighter.name} faces ${enemy.name} in the arena!`);
        }

        $('#btn-next-turn').disabled = false;
        $('#btn-next-turn').textContent = 'Next Turn';
        logGenerateStatus('Battle ready! Click Next Turn.');
    } catch (e) {
        logGenerateStatus(`Error: ${e.message}`, true);
    }
};

$('#btn-next-turn').onclick = async () => {
    if (!battleState) return;

    // Run the full simulation on the first click
    if (!battleState.result) {
        battleState.result = simulateBattle(battleState.player, battleState.enemy);
        battleState.log = battleState.result.log;
        battleState.index = 0;
    }

    const st = battleState;
    if (st.index < st.log.length) {
        const entry = st.log[st.index];
        addBattleLog(entry);
        updateHP(entry.pHp, entry.eHp, st.result.maxP, st.result.maxE);

        if (audioEnabled && entry.type === 'commentary') {
            await playAudio(entry.text);
        }
        st.index++;
    }

    if (st.index >= st.log.length) {
        $('#btn-next-turn').disabled = true;
        const r = st.result;
        addBattleLog({ type: 'commentary', text: `🏆 ${r.winner} wins! Final HP: ${st.player.name} ${r.playerHp} vs ${st.enemy.name} ${r.enemyHp}`, pHp: r.playerHp, eHp: r.enemyHp });

        if (audioEnabled) {
            await playAudio(`${r.winner} is victorious!`);
        }

        show($('#share-section'));
        // encodeURIComponent is unicode-safe (btoa is not)
        const share = `${window.location.origin}${window.location.pathname}?fighter=${encodeURIComponent(st.player.name)}&enemy=${encodeURIComponent(st.enemy.name)}&winner=${encodeURIComponent(r.winner)}`;
        $('#share-url').value = share;
    }
};

$('#btn-auto').onclick = async () => {
    if (!battleState) return;
    const btn = $('#btn-auto');
    btn.disabled = true;
    $('#btn-next-turn').disabled = true;
    while (battleState && (!battleState.result || battleState.index < battleState.log.length)) {
        await new Promise(async (resolve) => {
            await $('#btn-next-turn').onclick();
            setTimeout(resolve, 700);
        });
        if (!battleState) break;
    }
    btn.disabled = false;
};

$('#btn-new-fighter').onclick = () => {
    hide($('#battle-section'));
    hide($('#share-section'));
    show($('#create-section'));
    $('#fighter-input').value = '';
    $('#fighter-image').src = '';
    hide($('#fighter-image'));
    $('#generate-status').textContent = '';
    battleState = null;
};

$('#btn-copy').onclick = () => {
    const input = $('#share-url');
    input.select();
    document.execCommand('copy');
    const btn = $('#btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
};

$('#chk-voice').onchange = (e) => { audioEnabled = e.target.checked; };

// ---------- Init ----------

bindConnect();
checkAuth();
console.log('Tiny Fighter Arena loaded — Pollinations QUEST #17250');