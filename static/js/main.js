const $ = (selector) => document.querySelector(selector);
import { Avatar, createAvatarStage, setAvatarState, DEFAULT_AVATAR_CONFIG, PLAYER_AVATAR_OPTIONS, normalizeAvatarConfig } from './avatars.js';

let session = null;
let game = null;
let avatarStage = null;
let playerAvatar = null;
let bossAvatar = null;
let avatarConfig = normalizeAvatarConfig();

const api = async (path, body = {}) => {
  const payload = { ...body };
  const sessionId = payload.session_id;
  delete payload.session_id;

  const url = sessionId ? `${path}?session_id=${encodeURIComponent(sessionId)}` : path;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || 'Action unavailable');
  }

  return response.json();
};

const spells = [
  ['fire-spark', 'Fire Spark', 'BASIC', '20 DMG'],
  ['acid-shot', 'Acid Shot', 'BASIC', '20 DMG'],
  ['carbon-punch', 'Carbon Punch', 'BASIC', '20 DMG'],
  ['resonance-burst', 'Resonance Burst', 'MED', '30 DMG'],
  ['nucleophile-strike', 'Nucleophile Strike', 'MED', '30 DMG'],
  ['chiral-slash', 'Chiral Slash', 'MED', '30 DMG'],
  ['mechanism-storm', 'Mechanism Storm', 'STRONG', '45 DMG'],
  ['stereochemical-rift', 'Stereochemical Rift', 'STRONG', '45 DMG'],
  ['spectral-obliteration', 'Spectral Obliteration', 'STRONG', '45 DMG'],
];

function updateAvatarPreview() {
  const preview = $('.avatar-preview');
  if (!preview) return;

  let figure = preview.querySelector('.avatar-preview-art');
  if (!figure) {
    figure = Avatar({ character: 'organic-apprentice', state: 'idle', size: 'preview', config: avatarConfig });
    figure.classList.add('avatar-preview-art');
    preview.prepend(figure);
  } else {
    const replacement = Avatar({ character: 'organic-apprentice', state: 'idle', size: 'preview', config: avatarConfig });
    replacement.classList.add('avatar-preview-art');
    figure.replaceWith(replacement);
    figure = replacement;
  }

  let label = $('#avatar-preview-label');
  if (!label) {
    label = document.createElement('span');
    label.id = 'avatar-preview-label';
    preview.append(label);
  }

  label.textContent = `${avatarConfig.hair.style.toUpperCase()} // ${avatarConfig.coat.toUpperCase()} // ${avatarConfig.flask.toUpperCase()}`;
}

const optionLabels = {
  skinTones: 'Skin tone', hairStyles: 'Hair style', hairColors: 'Hair color', glasses: 'Glasses',
  coats: 'Lab coat', shirts: 'Shirt / vest', pants: 'Pants', shoes: 'Shoes', satchels: 'Satchel',
  flasks: 'Flask', accessories: 'Accessory', accents: 'Accent color',
};

const optionKeys = {
  skinTones: 'skinTone', hairStyles: 'hair.style', hairColors: 'hair.color', glasses: 'glasses',
  coats: 'coat', shirts: 'shirt', pants: 'pants', shoes: 'shoes', satchels: 'satchel',
  flasks: 'flask', accessories: 'accessory', accents: 'accentColor',
};

function readConfigValue(key) {
  return key.split('.').reduce((value, part) => value?.[part], avatarConfig);
}

function setConfigValue(key, value) {
  const parts = key.split('.');
  if (parts.length === 1) avatarConfig = normalizeAvatarConfig({ ...avatarConfig, [key]: value });
  else avatarConfig = normalizeAvatarConfig({ ...avatarConfig, [parts[0]]: { ...avatarConfig[parts[0]], [parts[1]]: value } });
}

function ensureAvatarCreatorUi() {
  const form = $('.avatar-form');
  if (!form || form.dataset.v3Ready) return;
  form.dataset.v3Ready = 'true';
  form.innerHTML = Object.entries(PLAYER_AVATAR_OPTIONS).map(([category, values]) => `<label>${optionLabels[category].toUpperCase()} <select data-avatar-option="${category}">${values.map((value) => `<option value="${value}">${value.replaceAll('-', ' ')}</option>`).join('')}</select></label>`).join('');
  form.querySelectorAll('[data-avatar-option]').forEach((select) => {
    const category = select.dataset.avatarOption;
    select.value = readConfigValue(optionKeys[category]);
    select.addEventListener('change', () => { setConfigValue(optionKeys[category], select.value); updateAvatarPreview(); });
  });

  const actions = document.createElement('div');
  actions.className = 'avatar-creator-actions';
  actions.innerHTML = '<button type="button" id="randomize-avatar" class="secondary">RANDOMIZE</button><button type="button" id="reset-avatar" class="secondary">RESET</button>';
  form.parentElement.insertBefore(actions, form.nextSibling);
  $('#randomize-avatar').onclick = () => {
    const random = (values) => values[Math.floor(Math.random() * values.length)];
    avatarConfig = normalizeAvatarConfig({
      ...avatarConfig, skinTone: random(PLAYER_AVATAR_OPTIONS.skinTones), glasses: random(PLAYER_AVATAR_OPTIONS.glasses),
      coat: random(PLAYER_AVATAR_OPTIONS.coats), shirt: random(PLAYER_AVATAR_OPTIONS.shirts), pants: random(PLAYER_AVATAR_OPTIONS.pants),
      shoes: random(PLAYER_AVATAR_OPTIONS.shoes), satchel: random(PLAYER_AVATAR_OPTIONS.satchels), flask: random(PLAYER_AVATAR_OPTIONS.flasks),
      accessory: random(PLAYER_AVATAR_OPTIONS.accessories), accentColor: random(PLAYER_AVATAR_OPTIONS.accents),
      hair: { style: random(PLAYER_AVATAR_OPTIONS.hairStyles), color: random(PLAYER_AVATAR_OPTIONS.hairColors) },
    });
    form.querySelectorAll('[data-avatar-option]').forEach((select) => { select.value = readConfigValue(optionKeys[select.dataset.avatarOption]); });
    updateAvatarPreview();
  };
  $('#reset-avatar').onclick = () => {
    avatarConfig = normalizeAvatarConfig(DEFAULT_AVATAR_CONFIG);
    form.querySelectorAll('[data-avatar-option]').forEach((select) => { select.value = readConfigValue(optionKeys[select.dataset.avatarOption]); });
    updateAvatarPreview();
  };
}

function ensureExplanationUi() {
  const brand = $('.brand');
  if (!brand) return;

  let button = $('#view-explanation');
  if (!button) {
    button = document.createElement('button');
    button.id = 'view-explanation';
    button.className = 'header-help';
    button.textContent = 'VIEW EXPLANATION';
    brand.parentElement.insertBefore(button, brand.nextSibling);
  }

  let modal = $('#explanation-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'explanation-modal';
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="modal-card">
        <button id="close-explanation" class="modal-close" aria-label="Close explanation">×</button>
        <div class="eyebrow">ORGO // CONCEPT REVIEW</div>
        <h2 id="explanation-title">WHY THIS ANSWER?</h2>
        <p id="explanation-question" class="modal-question"></p>
        <div class="modal-answer">
          <span class="hint">CORRECT ANSWER</span>
          <strong id="explanation-answer"></strong>
        </div>
        <p id="explanation-copy"></p>
        <button id="modal-done" class="primary">BACK TO BATTLE</button>
      </div>
    `;
    $('#app').append(modal);
    $('#close-explanation').onclick = closeExplanation;
    $('#modal-done').onclick = closeExplanation;
    modal.onclick = (event) => {
      if (event.target === modal) closeExplanation();
    };
  }

  button.onclick = () => {
    if (window.lastExplanation) showExplanation(window.lastExplanation);
  };
}

function closeExplanation() {
  $('#explanation-modal')?.classList.add('hidden');
}

function showExplanation(result) {
  window.lastExplanation = result;
  ensureExplanationUi();
  $('#explanation-question').textContent = result.question_prompt || 'Review the chemistry concept from the last trial.';
  $('#explanation-answer').textContent = result.correct_answer;
  $('#explanation-copy').textContent = result.explanation;
  $('#explanation-modal').classList.remove('hidden');
}

function showBattleModal({ title, copy, action = 'CONTINUE', onDone }) {
  let modal = $('#battle-outcome-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'battle-outcome-modal';
    modal.className = 'hidden';
    modal.innerHTML = `<div class="modal-card outcome-card"><div class="eyebrow">ORGO // BATTLE REPORT</div><h2 id="outcome-title"></h2><p id="outcome-copy" class="modal-question"></p><button id="outcome-action" class="primary"></button></div>`;
    $('#app').append(modal);
  }
  $('#outcome-title').textContent = title;
  $('#outcome-copy').textContent = copy;
  const button = $('#outcome-action');
  button.textContent = action;
  button.onclick = () => {
    modal.classList.add('hidden');
    if (onDone) onDone();
  };
  modal.classList.remove('hidden');
}

function render(s) {
  session = s;
  const chapterLabel = $('#chapter-label');
  if (chapterLabel) chapterLabel.textContent = `CHAPTER ${s.chapter} / ${s.chapter_name}`;

  const avatarPanel = $('#avatar-panel');
  if (avatarPanel) {
    avatarPanel.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'avatar-card';
    const panelArt = Avatar({ character: 'organic-apprentice', state: 'idle', size: 'panel', config: s.avatar?.config || s.avatar });
    panelArt.classList.add('avatar-panel-art');
    const info = document.createElement('div');
    info.innerHTML = `<div class="avatar-name">FIELD ALCHEMIST</div><div class="avatar-sub">${s.player.hp} / ${s.player.max_hp} HP</div>`;
    card.append(panelArt, info);
    avatarPanel.append(card);
  }

  const log = $('#log');
  if (log) {
    log.innerHTML = s.log.map((message) => `<div class="log-line">${message}</div>`).join('');
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }

  renderSpells(s);
  renderQuestion(s);
  drawScene(s);
  renderAvatars(s);
}

function renderAvatars(s) {
  if (!avatarStage) return;
  if (!playerAvatar) {
    playerAvatar = Avatar({ character: 'organic-apprentice', state: 'idle', size: 'player', direction: 'right', config: s.avatar?.config || s.avatar });
    bossAvatar = Avatar({ character: 'carbonyl-dragon', state: 'idle', size: 'boss', direction: 'left' });
    avatarStage.append(playerAvatar, bossAvatar);
  }
  playerAvatar.querySelector('.avatar-label')?.remove();
  bossAvatar.querySelector('.avatar-label')?.remove();
  const playerLabel = document.createElement('div');
  playerLabel.className = 'avatar-label player-label';
  playerLabel.textContent = `YOU // ${s.player.hp} HP`;
  const bossLabel = document.createElement('div');
  bossLabel.className = 'avatar-label boss-label';
  bossLabel.textContent = `${s.boss.name} // ${s.boss.hp} HP`;
  playerAvatar.append(playerLabel);
  bossAvatar.append(bossLabel);
}

function animateBattleResult(result) {
  if (!playerAvatar || !bossAvatar) return;
  setAvatarState(playerAvatar, result.correct ? 'cast' : 'miss');
  if (result.boss_hit) setTimeout(() => setAvatarState(playerAvatar, 'hit'), 430);
  if (result.correct) setTimeout(() => setAvatarState(bossAvatar, result.defeated ? 'defeated' : 'hit'), 420);
  if (result.defeated) setTimeout(() => setAvatarState(playerAvatar, 'victory'), 760);
  setTimeout(() => {
    if (!result.defeated) setAvatarState(playerAvatar, 'idle');
    if (!result.defeated) setAvatarState(bossAvatar, 'idle');
  }, 1500);
}

function renderSpells(s) {
  const spellsContainer = $('#spells');
  if (!spellsContainer) return;

  spellsContainer.innerHTML = `<div class="control-panel"><div class="control-title">ARSENAL // SELECT A SPELL</div><div class="spell-grid">${spells.map(([id, name, type, damage]) => {
    const cooldown = s.cooldowns?.[id] || 0;
    return `<button class="spell" data-spell="${id}" ${cooldown ? 'disabled' : ''}><div class="spell-name">${name}</div><div class="spell-meta">${type} · ${cooldown ? cooldown + 's' : damage}</div></button>`;
  }).join('')}</div></div>`;

  document.querySelectorAll('[data-spell]').forEach((button) => {
    button.onclick = async () => {
      try {
        render(await api('/api/battle/select-spell', { session_id: session.session_id, spell_id: button.dataset.spell }));
      } catch (error) {
        alert(error.message);
      }
    };
  });
}

function renderQuestion(s) {
  const container = $('#question');
  if (!container) return;

  const q = s.question;
  container.innerHTML = `<div class="control-panel">${q ? `<div class="control-title">VOCABULARY TRIAL // ONE ATTEMPT</div><div class="question">${q.prompt}</div><div class="answers">${q.choices.map((answer, index) => `<button class="answer" data-answer="${answer}"><span class="hint">${'ABCD'[index]}</span><br>${answer}</button>`).join('')}</div>` : `<div class="control-title">BATTLE STATUS</div><div class="question">${s.boss.name} awaits your next spell.</div><div class="hint">Choose a spell above to reveal a chemistry trial.</div>`}</div>`;

  document.querySelectorAll('[data-answer]').forEach((button) => {
    button.onclick = async () => {
      try {
        const result = await api('/api/battle/answer', { session_id: session.session_id, answer: button.dataset.answer });
        render(result);
        showOutcome(result);
      } catch (error) {
        alert(error.message);
      }
    };
  });
}

function showOutcome(r) {
  animateBattleResult(r);
  const msg = r.defeated
    ? `VICTORY — ${r.boss.name} defeated.`
    : r.defeat
      ? 'DEFEAT — retry to regroup.'
      : r.correct
        ? `DIRECT HIT — ${r.damage} damage. ${r.boss_hit ? 'Counterattack!' : 'Boss missed!'}`
        : `SPELL FIZZLE — correct answer: ${r.correct_answer}`;

  if (!r.correct && !r.defeated) {
    window.lastExplanation = r;
    ensureExplanationUi();
    const headerButton = $('#view-explanation');
    if (headerButton) {
      headerButton.textContent = 'EXPLANATION';
      headerButton.classList.add('available');
    }
    showBattleModal({
      title: 'SPELL FIZZLE',
      copy: `The spell fizzled. Correct answer: ${r.correct_answer}`,
      action: 'VIEW EXPLANATION',
      onDone: () => showExplanation(r),
    });
    return;
  }

  if (r.defeat) {
    showBattleModal({ title: 'DEFEAT', copy: 'Your aura fades. Regroup and try the battle again.', action: 'RETRY', onDone: () => api('/api/battle/retry', { session_id: session.session_id }).then(render) });
  } else if (r.defeated) {
    showBattleModal({ title: 'VICTORY', copy: `${r.boss.name} defeated.`, action: 'CONTINUE', onDone: () => api('/api/battle/next-turn', { session_id: session.session_id }).then((nextState) => {
      if (nextState.victory) showBattleModal({ title: 'SPECTRAL CHAMPION', copy: 'All chapters complete.', action: 'CLOSE' });
      else render(nextState);
    }) });
  } else {
    showBattleModal({ title: r.correct ? 'DIRECT HIT' : 'BATTLE UPDATE', copy: msg, action: 'BACK TO BATTLE' });
  }
}

function startPhaser() {
  if (game) return;

  avatarStage = createAvatarStage();
  $('#phaser')?.append(avatarStage);

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser',
    width: 900,
    height: 520,
    backgroundColor: '#0b1e2c',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: {
      preload() {
        this.load.image('arena', '/static/assets/battle-arena.png');
      },
      create() {
        this.arena = this.add.image(this.scale.width / 2, this.scale.height / 2, 'arena').setOrigin(0.5);
        this.resizeArena();
        this.scale.on('resize', () => this.resizeArena());
      },
      resizeArena() {
        if (!this.arena) return;
        this.arena.setPosition(this.scale.width / 2, this.scale.height / 2);
        this.arena.setDisplaySize(this.scale.width, this.scale.height);
      },
    },
  });
}

function drawScene(s) {
  if (!game?.scene?.scenes?.[0]) return;

  const scene = game.scene.scenes[0];
  const width = scene.scale.width;
  const height = scene.scale.height;
  scene.children.list.filter((x) => x.getData?.('dynamic')).forEach((x) => x.destroy());

  const chapterColor = Phaser.Display.Color.HexStringToColor(s.chapter_color).color;
  scene.add.text(width * 0.5, height * 0.12, `${s.chapter_name.toUpperCase()} // ${s.boss.lore}`, { fontFamily: 'DM Mono', fontSize: '12px', color: '#b8cecc' }).setOrigin(0.5).setData('dynamic', true);
  scene.add.circle(width * 0.72, height * 0.48, Math.min(125, width * 0.18), chapterColor, 0.08).setStrokeStyle(2, chapterColor, 0.45).setData('dynamic', true);
}

function bindDomEvents() {
  const startButton = $('#start');
  if (startButton) {
    startButton.addEventListener('click', async () => {
      session = await api('/api/game/new', {});
      avatarConfig = normalizeAvatarConfig(DEFAULT_AVATAR_CONFIG);
      $('#boot')?.classList.add('hidden');
      $('#avatar-creator')?.classList.remove('hidden');
      ensureAvatarCreatorUi();
      updateAvatarPreview();
    });
  }

  const acceptButton = $('#accept-avatar');
  if (acceptButton) {
    acceptButton.addEventListener('click', async () => {
      const avatar = { body: 'arc', skin: avatarConfig.skinTone, hair: avatarConfig.hair.color, outfit: avatarConfig.coat, accessory: avatarConfig.accessory, aura: avatarConfig.accentColor, config: avatarConfig };
      session = await api('/api/avatar/finalize', { session_id: session.session_id, ...avatar });
      $('#avatar-creator')?.classList.add('hidden');
      $('#game-shell')?.classList.remove('hidden');
      startPhaser();
      render(session);
    });
  }

  ensureExplanationUi();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindDomEvents);
} else {
  bindDomEvents();
}
