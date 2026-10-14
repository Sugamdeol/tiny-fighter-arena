// Tiny Fighter Arena - Pollinations QUEST #17250
// Players describe a fighter, AI brings it to life, battle with commentary

const POLLINATIONS_API = 'https://gen.pollinations.ai';
let authToken = null;
let currentFighter = null;
let battleState = null;
let audioEnabled = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function setText(el, text) { el.textContent = text; }
function setHTML(el, html) { el.innerHTML = html; }

// Pollinations API calls
async function pollinationsRequest(endpoint, body, useAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    const resp = await fetch(`${POLLINATIONS_API}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    return resp.json();
}

// Generate fighter description from prompt
async function generateFighter(prompt) {
    const resp = await pollinationsRequest('/v1/chat/completions', {
        model: 'openai/gpt-5.4-nano',
        messages: [{
            role: 'system',
            content: `You are a creative fighter designer. Given a one-line description, create a detailed fighter profile for a battle game. Return JSON with:
{
  "name": "Fighter name",
  "title": "Epithet/title",
  "appearance": "Visual description for image generation",
  "style": "Fighting style description",
  "abilities": ["ability1", "ability2", "ability3"],
  "personality": "Brief personality",
  "hp": 100,
  "attack": 15,
  "defense": 10,
  "speed": 12
}
Keep it balanced for fair battles.`
        }, {
            role: 'user',
            content: prompt
        }],
        response_format: { type: 'json_object' },
        temperature: 0.8
    }, true);
    
    return JSON.parse(resp.choices[0].message.content);
}

// Generate fighter image
async function generateImage(prompt) {
    const encoded = encodeURIComponent(prompt);
    const url = `${POLLINATIONS_API}/image/${encoded}?model=black-forest-labs/flux.1-schnell&key=${authToken || ''}`;
    return url;
}

// Generate audio commentary
async function generateAudio(text) {
    const encoded = encodeURIComponent(text);
    const url = `${POLLINATIONS_API}/audio/${encoded}?model=openai/tts-1&voice=onyx&key=${authToken || ''}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Audio generation failed');
    return URL.createObjectURL(await resp.blob());
}

// Generate challenger
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

// Battle simulation
function simulateBattle(player, enemy) {
    const log = [];
    let pHp = player.hp, eHp = enemy.hp;
    let turn = 1;
    
    while (pHp > 0 && eHp > 0 && turn <= 20) {
        // Player attacks
        const pDmg = Math.max(1, player.attack - enemy.defense + Math.floor(Math.random() * 5) - 2);
        eHp = Math.max(0, eHp - pDmg);
        log.push({ type: 'player-action', text: `${player.name} strikes ${enemy.name} for ${pDmg} damage!` });
        
        // Commentary
        const commentaries = [
            'A devastating blow!',
            'The crowd roars!',
            'What precision!',
            'Steel meets steel!',
            'The arena trembles!'
        ];
        log.push({ type: 'commentary', text: commentaries[Math.floor(Math.random() * commentaries.length)] });
        
        if (eHp <= 0) break;
        
        // Enemy attacks
        const eDmg = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 5) - 2);
        pHp = Math.max(0, pHp - eDmg);
        log.push({ type: 'enemy-action', text: `${enemy.name} counters ${player.name} for ${eDmg} damage!` });
        
        turn++;
    }
    
    const winner = pHp > 0 ? player.name : enemy.name;
    log.push({ type: 'commentary', text: `🏆 ${winner} stands victorious!` });
    
    return { log, winner, playerHp: pHp, enemyHp: eHp };
}

// UI Functions
function logGenerateStatus(msg, isError = false) {
    const el = $('#generate-status');
    setText(el, msg);
    el.className = isError ? 'auth-error' : 'auth-success';
    show(el);
}

function logAuthStatus(msg, isError = false) {
    const el = $('#auth-status');
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

function updateHP(playerHp, enemyHp) {
    $('#player-hp .hp-fill').style.width = `${Math.max(0, playerHp)}%`;
    $('#enemy-hp .hp-fill').style.width = `${Math.max(0, enemyHp)}%`;
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
        const url = await generateAudio(text);
        const audio = new Audio(url);
        await audio.play();
    } catch (e) {
        console.warn('Audio failed:', e);
    }
}

// Event Handlers
$('#btn-connect').onclick = async () => {
    // Use Pollinations device flow or direct auth
    // For simplicity, we'll use the app's BYOP flow
    const clientId = 'pk_tiny-fighter-arena'; // Would need real app key
    window.location.href = `https://enter.pollinations.ai/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.href)}&scope=usage&models=text,image,audio&budget=5&expiry=7`;
};

// Check for auth token in URL (BYOP flow)
function checkAuth() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('api_key') || params.get('access_token');
    if (token) {
        authToken = token;
        logAuthStatus('✅ Connected to Pollinations! You can now generate fighters.');
        hide($('#auth-section'));
        show($('#create-section'));
        $('#btn-generate').disabled = false;
        // Clean URL
        history.replaceState(null, '', window.location.pathname);
    }
}

$('#btn-generate').onclick = async () => {
    const prompt = $('#fighter-input').value.trim();
    if (!prompt) return logGenerateStatus('Enter a fighter description!', true);
    
    $('#btn-generate').disabled = true;
    logGenerateStatus('🎨 Designing your fighter...');
    
    try {
        // Generate fighter data
        const fighter = await generateFighter(prompt);
        logGenerateStatus('🎨 Fighter designed! Generating art...');
        
        // Generate image if checked
        if ($('#chk-image').checked && authToken) {
            const imgUrl = await generateImage(fighter.appearance);
            $('#fighter-image').src = imgUrl;
            show($('#fighter-image'));
        }
        
        // Generate voice intro if checked
        if ($('#chk-voice').checked && authToken) {
            logGenerateStatus('🎙️ Generating voice intro...');
            await playAudio(`Behold! ${fighter.name}, ${fighter.title}! ${fighter.style}`);
        }
        
        displayFighter(fighter);
        hide($('#create-section'));
        logGenerateStatus('✅ Fighter ready for battle!');
        
    } catch (e) {
        logGenerateStatus(`❌ Error: ${e.message}`, true);
    } finally {
        $('#btn-generate').disabled = false;
    }
};

$('#btn-battle').onclick = async () => {
    hide($('#fighter-display'));
    show($('#battle-section');
    
    logAuthStatus('⚔️ Summoning a challenger...');
    
    try {
        const enemy = await generateChallenger();
        battleState = { player: currentFighter, enemy, turn: 0 };
        
        setPlayerInfo(currentFighter);
        setEnemyInfo(enemy);
        updateHP(100, 100);
        
        $('#battle-log').innerHTML = '';
        addBattleLog({ type: 'commentary', text: `⚔️ ${currentFighter.name} vs ${enemy.name} — Let the battle begin!` });
        
        if (audioEnabled) {
            await playAudio(`${currentFighter.name} faces ${enemy.name} in the arena!`);
        }
        
        $('#btn-next-turn').disabled = false;
        logAuthStatus('🎮 Battle ready! Click Next Turn.');
        
    } catch (e) {
        logAuthStatus(`❌ Error: ${e.message}`, true);
    }
};

let battleLog = [];
let battleIndex = 0;

$('#btn-next-turn').onclick = async () => {
    if (!battleState) return;
    
    if (battleIndex === 0) {
        // First click - run full simulation
        const result = simulateBattle(battleState.player, battleState.enemy);
        battleLog = result.log;
        battleState.result = result;
        battleIndex = 0;
    }
    
    if (battleIndex < battleLog.length) {
        const entry = battleLog[battleIndex];
        addBattleLog(entry);
        
        if (entry.type === 'player-action' || entry.type === 'enemy-action') {
            // Update HP based on cumulative damage
            // Simplified - just show final at end
        }
        
        if (audioEnabled && entry.type === 'commentary') {
            await playAudio(entry.text);
        }
        
        battleIndex++;
    }
    
    if (battleIndex >= battleLog.length) {
        $('#btn-next-turn').disabled = true;
        const result = battleState.result;
        addBattleLog({ type: 'commentary', text: `🏆 ${result.winner} wins! Final HP: You ${result.playerHp} vs ${result.enemyHp}` });
        
        if (audioEnabled) {
            await playAudio(`${result.winner} is victorious!`);
        }
        
        show($('#share-section'));
        const shareUrl = `${window.location.origin}${window.location.pathname}?battle=${btoa(JSON.stringify(battleState))}`;
        $('#share-url').value = shareUrl;
    }
};

$('#btn-auto').onclick = async () => {
    $('#btn-next-turn').disabled = true;
    $('#btn-auto').disabled = true;
    
    while (battleIndex < battleLog.length) {
        $('#btn-next-turn').click();
        await new Promise(r => setTimeout(r, 800));
    }
    $('#btn-auto').disabled = false;
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
    battleLog = [];
    battleIndex = 0;
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

// Initialize
checkAuth();
console.log('Tiny Fighter Arena loaded - Pollinations QUEST #17250');