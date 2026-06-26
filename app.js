/**
 * PREMIUM CALCULATOR APPLICATION
 * Features: Multi-theme architecture, interactive sound synthesis,
 * gesture controls, dynamic layout transitions, formula-to-code evaluation.
 */

// Global App State
const state = {
  expression: '',       // The current visual expression string (e.g., "sin(30) × 5")
  evalExpression: '',   // The math-string evaluated by JS engine (e.g., "sin(30) * 5")
  lastAnswer: 0,        // Store the last evaluated result
  angleMode: 'RAD',     // RAD or DEG
  soundEnabled: true,   // Click sound FX
  history: [],          // Array of {expr, result}
  activeMode: 'standard', // 'standard' or 'scientific'
  isPro: false,         // Paywall subscription state
  calculationCount: 0,  // Number of completed calculations
};

// Web Audio API Synth Cache
let audioCtx = null;

// DOM Elements cache
const dom = {
  expressionDisplay: document.getElementById('expression-display'),
  mainDisplay: document.getElementById('main-display'),
  livePreview: document.getElementById('live-preview-display'),
  btnSound: document.getElementById('btn-sound'),
  btnHistory: document.getElementById('btn-history'),
  btnTheme: document.getElementById('btn-theme'),
  historyDrawer: document.getElementById('history-drawer'),
  themeDrawer: document.getElementById('theme-drawer'),
  closeHistory: document.getElementById('close-history'),
  closeTheme: document.getElementById('close-theme'),
  historyList: document.getElementById('history-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  keyboardStandard: document.getElementById('keyboard-standard'),
  keyboardScientific: document.getElementById('keyboard-scientific'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  btnDegRad: document.getElementById('btn-deg-rad'),
  copyTooltip: document.getElementById('copy-tooltip'),
  displayContainer: document.getElementById('display-container'),
  
  // Paywall elements
  paywallModal: document.getElementById('paywall-modal'),
  btnPayCard: document.getElementById('btn-pay-card'),
  btnPayApple: document.getElementById('btn-pay-apple'),
  btnPayPaypal: document.getElementById('btn-pay-paypal'),
  successScreen: document.getElementById('success-screen'),
  btnSuccessClose: document.getElementById('btn-success-close'),
  cardNumInput: document.getElementById('card-num'),
  cardExpiryInput: document.getElementById('card-expiry'),
  cardCvcInput: document.getElementById('card-cvc'),
  payTabs: document.querySelectorAll('.pay-tab'),
  payForms: document.querySelectorAll('.pay-form'),
};

/* ==========================================================================
   INITIALIZATION & THEME SETUPS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Load saved preferences
  loadPreferences();
  
  // Set up click listeners for all calculator buttons
  initCalculatorButtons();
  
  // Set up utility event listeners
  initEventListeners();
  
  // Update display
  updateDisplay();
});

function loadPreferences() {
  // 1. Theme Selection
  const savedTheme = localStorage.getItem('calc-theme') || 'aurora';
  setTheme(savedTheme);
  
  // Update active state in theme drawer
  document.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.dataset.theme === savedTheme) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  // 2. Sound Toggle
  const savedSound = localStorage.getItem('calc-sound');
  state.soundEnabled = savedSound !== 'false'; // Enabled by default
  updateSoundButtonUI();

  // 3. History
  const savedHistory = localStorage.getItem('calc-history');
  if (savedHistory) {
    state.history = JSON.parse(savedHistory);
  }

  // 4. Last Answer
  const savedAns = localStorage.getItem('calc-last-ans');
  if (savedAns) {
    state.lastAnswer = parseFloat(savedAns) || 0;
  }

  // 5. Pro Paywall status
  state.isPro = localStorage.getItem('calc-pro') === 'true';
  state.calculationCount = parseInt(localStorage.getItem('calc-count')) || 0;
  updateAccountBadge();
}

function setTheme(themeName) {
  document.body.className = '';
  document.body.classList.add(`theme-${themeName}`);
  localStorage.setItem('calc-theme', themeName);
}

/* ==========================================================================
   SOUND SYNTHESIZER (Web Audio API)
   ========================================================================== */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playClickSound(keyType) {
  if (!state.soundEnabled) return;
  
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Audio configurations based on key roles
    let frequency = 440;
    let duration = 0.06; // seconds
    let type = 'sine';

    switch (keyType) {
      case 'num':
        frequency = 380;
        duration = 0.05;
        break;
      case 'operator':
        frequency = 520;
        duration = 0.06;
        break;
      case 'action':
        frequency = 280;
        duration = 0.07;
        break;
      case 'sci':
        frequency = 480;
        duration = 0.05;
        break;
      case 'equals':
        // Custom rising pitch sequence for equals
        frequency = 580;
        duration = 0.12;
        break;
      case 'warning':
        frequency = 150;
        duration = 0.25;
        type = 'sawtooth';
        break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Equalizer style sweeps
    if (keyType === 'equals') {
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + duration);
    } else if (keyType === 'warning') {
      osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + duration);
    }

    // Smooth envelope decay to avoid audio clicks
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio feedback failed', e);
  }
}

function updateSoundButtonUI() {
  const icon = dom.btnSound.querySelector('i');
  if (state.soundEnabled) {
    dom.btnSound.classList.remove('muted');
    icon.className = 'fa-solid fa-volume-high';
  } else {
    dom.btnSound.classList.add('muted');
    icon.className = 'fa-solid fa-volume-xmark';
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('calc-sound', state.soundEnabled);
  updateSoundButtonUI();
  
  // Play test sound if enabled
  if (state.soundEnabled) {
    playClickSound('num');
  }
}

/* ==========================================================================
   HAPTICS (Vibrate)
   ========================================================================== */
function triggerHaptics() {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

/* ==========================================================================
   CALCULATOR LOGIC ENGINE
   ========================================================================== */
function initCalculatorButtons() {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // Prevent zoom, tap selection, and double-firing click events
      
      const key = btn.dataset.key;
      let keyType = 'num';
      
      if (btn.classList.contains('btn-operator')) keyType = 'operator';
      else if (btn.classList.contains('btn-action')) keyType = 'action';
      else if (btn.classList.contains('btn-sci')) keyType = 'sci';
      else if (btn.classList.contains('btn-equals')) keyType = 'equals';
      
      playClickSound(keyType);
      triggerHaptics();
      handleKeyPress(key);
    });
  });
}

function handleKeyPress(key) {
  // Clear standard reset
  if (key === 'clear') {
    state.expression = '';
    state.evalExpression = '';
    updateDisplay();
    return;
  }
  
  // Delete last element
  if (key === 'backspace') {
    handleBackspace();
    return;
  }
  
  // Evaluate
  if (key === 'equals') {
    evaluateExpression();
    return;
  }

  // Deg/Rad toggler
  if (key === 'deg-rad') {
    toggleAngleMode();
    return;
  }

  // Handle specific buttons mappings
  appendKey(key);
  updateDisplay();
}

function appendKey(key) {
  // Prevent leading operators
  const operators = ['+', '-', '*', '/', '^'];
  if (operators.includes(key) && state.expression === '') {
    if (key === '-') {
      state.expression = '-';
      state.evalExpression = '-';
    }
    return;
  }

  // Match corresponding displays & JS eval codes
  switch (key) {
    case '*':
      state.expression += ' × ';
      state.evalExpression += '*';
      break;
    case '/':
      state.expression += ' ÷ ';
      state.evalExpression += '/';
      break;
    case '+':
      state.expression += ' + ';
      state.evalExpression += '+';
      break;
    case '-':
      state.expression += ' − ';
      state.evalExpression += '-';
      break;
    case '^':
      state.expression += '^';
      state.evalExpression += '**';
      break;
    case 'percent':
      state.expression += '%';
      state.evalExpression += '*0.01'; // Simplified percentage eval
      break;
    case 'pi':
      state.expression += 'π';
      state.evalExpression += 'Math.PI';
      break;
    case 'e':
      state.expression += 'e';
      state.evalExpression += 'Math.E';
      break;
    case 'parentheses':
      handleParentheses();
      break;
    case 'sin':
      state.expression += 'sin(';
      state.evalExpression += 'sin(';
      break;
    case 'cos':
      state.expression += 'cos(';
      state.evalExpression += 'cos(';
      break;
    case 'tan':
      state.expression += 'tan(';
      state.evalExpression += 'tan(';
      break;
    case 'sin-1':
      state.expression += 'asin(';
      state.evalExpression += 'asin(';
      break;
    case 'cos-1':
      state.expression += 'acos(';
      state.evalExpression += 'acos(';
      break;
    case 'tan-1':
      state.expression += 'atan(';
      state.evalExpression += 'atan(';
      break;
    case 'ln':
      state.expression += 'ln(';
      state.evalExpression += 'ln(';
      break;
    case 'log':
      state.expression += 'log(';
      state.evalExpression += 'log(';
      break;
    case 'sqrt':
      state.expression += '√(';
      state.evalExpression += 'sqrt(';
      break;
    case 'abs':
      state.expression += 'abs(';
      state.evalExpression += 'abs(';
      break;
    case 'fact':
      state.expression += 'fact(';
      state.evalExpression += 'fact(';
      break;
    case 'ans':
      state.expression += 'Ans';
      state.evalExpression += `(${state.lastAnswer})`;
      break;
    default:
      // Regular numbers and decimals
      state.expression += key;
      state.evalExpression += key;
      break;
  }
}

function handleBackspace() {
  // If visual string ends with space-operator-space, strip 3 characters
  if (state.expression.endsWith(' × ') || state.expression.endsWith(' ÷ ') || 
      state.expression.endsWith(' + ') || state.expression.endsWith(' − ')) {
    state.expression = state.expression.slice(0, -3);
    state.evalExpression = state.evalExpression.slice(0, -1);
  } else if (state.expression.endsWith('sin(') || state.expression.endsWith('cos(') || state.expression.endsWith('tan(') ||
             state.expression.endsWith('log(') || state.expression.endsWith('abs(')) {
    state.expression = state.expression.slice(0, -4);
    state.evalExpression = state.evalExpression.slice(0, -4);
  } else if (state.expression.endsWith('asin(') || state.expression.endsWith('acos(') || state.expression.endsWith('atan(') ||
             state.expression.endsWith('fact(')) {
    state.expression = state.expression.slice(0, -5);
    state.evalExpression = state.evalExpression.slice(0, -5);
  } else if (state.expression.endsWith('√(')) {
    state.expression = state.expression.slice(0, -2);
    state.evalExpression = state.evalExpression.slice(0, -5); // 'sqrt(' is 5 chars
  } else if (state.expression.endsWith('ln(')) {
    state.expression = state.expression.slice(0, -3);
    state.evalExpression = state.evalExpression.slice(0, -3); // 'ln(' is 3 chars
  } else if (state.expression.endsWith('Ans')) {
    state.expression = state.expression.slice(0, -3);
    state.evalExpression = state.evalExpression.slice(0, -`(${state.lastAnswer})`.length);
  } else if (state.expression.length > 0) {
    state.expression = state.expression.slice(0, -1);
    state.evalExpression = state.evalExpression.slice(0, -1);
  }
  updateDisplay();
}

function handleParentheses() {
  // Intelligent bracket parser
  const openCount = (state.expression.match(/\(/g) || []).length;
  const closeCount = (state.expression.match(/\)/g) || []).length;
  const lastChar = state.expression.slice(-1);

  if (openCount > closeCount && !isNaN(lastChar) && lastChar !== '') {
    state.expression += ')';
    state.evalExpression += ')';
  } else {
    // If last character is a digit or pi/e/Ans, inject an implicit multiplication operator
    if (!isNaN(lastChar) && lastChar !== '' || ['π', 'e', 's', ')'].includes(lastChar)) {
      state.expression += ' × (';
      state.evalExpression += '*(';
    } else {
      state.expression += '(';
      state.evalExpression += '(';
    }
  }
}

function toggleAngleMode() {
  state.angleMode = state.angleMode === 'RAD' ? 'DEG' : 'RAD';
  dom.btnDegRad.textContent = state.angleMode;
  dom.btnDegRad.classList.toggle('active', state.angleMode === 'DEG');
  updateDisplay();
}

/* ==========================================================================
   SAFE EVALUATION ENVIRONMENT
   ========================================================================== */
function executeMath(expression) {
  // Clean empty parentheses
  let sanExpr = expression.replace(/\(\)/g, '');
  if (!sanExpr) return 0;

  // Local mathematical constants and functions injected into evaluation environment
  const DEG = state.angleMode === 'DEG';
  
  const sin = (x) => DEG ? Math.sin(x * Math.PI / 180) : Math.sin(x);
  const cos = (x) => DEG ? Math.cos(x * Math.PI / 180) : Math.cos(x);
  const tan = (x) => DEG ? Math.tan(x * Math.PI / 180) : Math.tan(x);
  const asin = (x) => DEG ? Math.asin(x) * 180 / Math.PI : Math.asin(x);
  const acos = (x) => DEG ? Math.acos(x) * 180 / Math.PI : Math.acos(x);
  const atan = (x) => DEG ? Math.atan(x) * 180 / Math.PI : Math.atan(x);
  const ln = (x) => Math.log(x);
  const log = (x) => Math.log10(x);
  const sqrt = (x) => Math.sqrt(x);
  const abs = (x) => Math.abs(x);
  
  // Custom Factorial function
  const fact = (x) => {
    if (x < 0) return NaN;
    if (!Number.isInteger(x)) return Gamma(x + 1); // fallback for float factorials if needed, else standard integer check
    if (x === 0 || x === 1) return 1;
    let result = 1;
    for (let i = 2; i <= x; i++) result *= i;
    return result;
  };

  // Basic Gamma function approximation (Lanczos) for complex fact support
  const Gamma = (z) => {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * Gamma(1 - z));
    z -= 1;
    const x = 0.99999999999980993;
    const p = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507381424447053, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    let t = z + 7.5;
    let sum = x;
    for (let i = 0; i < p.length; i++) sum += p[i] / (z + i + 1);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * sum;
  };

  // Safe Function evaluation window wrapper
  // Avoids direct window pollution & intercepts code blocks
  try {
    // Autoclose open brackets
    const openBrackets = (sanExpr.match(/\(/g) || []).length;
    const closeBrackets = (sanExpr.match(/\)/g) || []).length;
    if (openBrackets > closeBrackets) {
      sanExpr += ')'.repeat(openBrackets - closeBrackets);
    }

    // Call execution compiler scope
    const evalFn = new Function(
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs', 'fact',
      `return (${sanExpr});`
    );

    const result = evalFn(sin, cos, tan, asin, acos, atan, ln, log, sqrt, abs, fact);
    
    if (result === undefined || isNaN(result) || !isFinite(result)) {
      return 'Error';
    }
    
    // Format precision to avoid floating point anomalies (e.g., 0.1 + 0.2 = 0.30000000000000004)
    return formatResult(result);
  } catch (error) {
    return 'Error';
  }
}

function formatResult(number) {
  if (Math.abs(number) < 1e-12 && Math.abs(number) > 0) return '0';
  
  // Convert scientific notation if number is extremely large/small
  if (Math.abs(number) >= 1e15 || (Math.abs(number) < 1e-6 && Math.abs(number) > 0)) {
    return number.toExponential(8).replace(/\+/, '');
  }

  // Format decimal precision to maximum 10 decimal digits
  const fixedString = Number(number.toFixed(10)).toString();
  return fixedString;
}

function evaluateExpression() {
  if (!state.expression) return;

  // Paywall limit check: trigger block if not Pro and already calculated once
  if (!state.isPro && state.calculationCount >= 1) {
    playClickSound('warning');
    triggerHaptics();
    dom.paywallModal.classList.add('open');
    return;
  }

  const result = executeMath(state.evalExpression);
  
  if (result === 'Error') {
    dom.mainDisplay.textContent = 'Error';
    dom.mainDisplay.style.fontSize = '2.75rem';
    return;
  }

  // Increment usage count for free accounts
  if (!state.isPro) {
    state.calculationCount++;
    localStorage.setItem('calc-count', state.calculationCount);
  }

  // Update history array
  state.history.unshift({
    expression: state.expression,
    result: result
  });

  // Keep history size capped at 30 items
  if (state.history.length > 30) {
    state.history.pop();
  }

  // Save changes locally
  state.lastAnswer = parseFloat(result) || 0;
  localStorage.setItem('calc-history', JSON.stringify(state.history));
  localStorage.setItem('calc-last-ans', state.lastAnswer);

  // Update visual states
  state.expression = result.toString();
  state.evalExpression = result.toString();
  
  updateDisplay();
  buildHistoryList();
  
  // Clear live preview since we computed the result
  dom.livePreview.textContent = '';
}

function calculateLivePreview() {
  if (!state.expression) {
    dom.livePreview.textContent = '';
    return;
  }
  
  // Don't show preview if it matches current value, is just a number, or has trailing active operators
  const endsWithOp = /[\+\-\*\/^]$/.test(state.evalExpression.trim());
  if (endsWithOp || !isNaN(state.expression.replace(/[\s\−\+]/g, ''))) {
    dom.livePreview.textContent = '';
    return;
  }

  const previewVal = executeMath(state.evalExpression);
  if (previewVal !== 'Error' && previewVal.toString() !== state.expression) {
    dom.livePreview.textContent = `= ${previewVal}`;
  } else {
    dom.livePreview.textContent = '';
  }
}

/* ==========================================================================
   DISPLAY RENDER & DYNAMIC FONT SIZER
   ========================================================================== */
function updateDisplay() {
  // Render visual expression formula
  dom.expressionDisplay.textContent = state.expression;
  
  // Render main display values
  if (state.expression === '') {
    dom.mainDisplay.textContent = '0';
  } else {
    dom.mainDisplay.textContent = state.expression;
  }

  // Font Auto Scaling to prevent text container clipping
  adjustFontSize();

  // Run async live computation preview
  calculateLivePreview();
}

function adjustFontSize() {
  const length = dom.mainDisplay.textContent.length;
  
  if (length <= 8) {
    dom.mainDisplay.style.fontSize = '2.75rem';
  } else if (length <= 12) {
    dom.mainDisplay.style.fontSize = '2.2rem';
  } else if (length <= 16) {
    dom.mainDisplay.style.fontSize = '1.75rem';
  } else {
    dom.mainDisplay.style.fontSize = '1.35rem';
  }
}

/* ==========================================================================
   GESTURE CONTROLS & COPING
   ========================================================================== */
// Swipe to backspace
let touchStartX = 0;
let touchStartY = 0;

dom.displayContainer.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

dom.displayContainer.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;
  
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  
  // Check horizontal swipe with low vertical movement
  if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
    playClickSound('action');
    triggerHaptics();
    handleBackspace();
  }
}, { passive: true });

// Copy value to clipboard on click/tap display
dom.mainDisplay.addEventListener('click', () => {
  const currentVal = dom.mainDisplay.textContent;
  if (currentVal === '0' || currentVal === 'Error') return;

  navigator.clipboard.writeText(currentVal)
    .then(() => {
      // Trigger tooltip notification
      dom.copyTooltip.classList.add('show');
      setTimeout(() => {
        dom.copyTooltip.classList.remove('show');
      }, 1500);
      
      triggerHaptics();
    })
    .catch(err => {
      console.error('Clipboard copy failed: ', err);
    });
});

/* ==========================================================================
   DRAWER CONTROL FLOWS
   ========================================================================== */
function initEventListeners() {
  // Theme Toggle Modal
  dom.btnTheme.addEventListener('click', () => {
    dom.themeDrawer.classList.add('open');
    dom.historyDrawer.classList.remove('open');
    triggerHaptics();
  });
  
  dom.closeTheme.addEventListener('click', () => {
    dom.themeDrawer.classList.remove('open');
    triggerHaptics();
  });

  // History Toggle Modal
  dom.btnHistory.addEventListener('click', () => {
    buildHistoryList();
    dom.historyDrawer.classList.add('open');
    dom.themeDrawer.classList.remove('open');
    triggerHaptics();
  });
  
  dom.closeHistory.addEventListener('click', () => {
    dom.historyDrawer.classList.remove('open');
    triggerHaptics();
  });

  // Clear History
  dom.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('calc-history');
    buildHistoryList();
    triggerHaptics();
  });

  // Keyboard support for desktop layouts
  document.addEventListener('keydown', handlePhysicalKeyboard);

  // Sound feedback toggle
  dom.btnSound.addEventListener('click', () => {
    toggleSound();
    triggerHaptics();
  });

  // Mode toggler tabs (Standard/Scientific)
  dom.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      switchMode(mode);
      triggerHaptics();
      playClickSound('action');
    });
  });
}

function switchMode(mode) {
  state.activeMode = mode;
  dom.modeTabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.add('active');

  if (mode === 'standard') {
    dom.keyboardStandard.classList.add('mode-active');
    dom.keyboardScientific.classList.remove('mode-active');
  } else {
    dom.keyboardScientific.classList.add('mode-active');
    dom.keyboardStandard.classList.remove('mode-active');
  }
}

function buildHistoryList() {
  dom.historyList.innerHTML = '';

  if (state.history.length === 0) {
    dom.historyList.innerHTML = '<div class="empty-history-msg">No history yet</div>';
    return;
  }

  state.history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-expr">${item.expression}</div>
      <div class="history-item-val">${item.result}</div>
    `;
    
    // Inject expression back to display on double click or click
    div.addEventListener('click', () => {
      state.expression = item.result.toString();
      state.evalExpression = item.result.toString();
      updateDisplay();
      dom.historyDrawer.classList.remove('open');
      triggerHaptics();
      playClickSound('num');
    });

    dom.historyList.appendChild(div);
  });
}

// Map theme switch options inside drawer
document.querySelectorAll('.theme-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
    
    const selectedTheme = option.dataset.theme;
    setTheme(selectedTheme);
    triggerHaptics();
    playClickSound('action');
  });
});

/* ==========================================================================
   PHYSICAL KEYBOARD INPUT
   ========================================================================== */
function handlePhysicalKeyboard(e) {
  const activeDrawer = document.querySelector('.panel-drawer.open');
  if (activeDrawer) {
    if (e.key === 'Escape') {
      activeDrawer.classList.remove('open');
      return;
    }
  }

  // Intercept normal browser triggers
  if (e.key === 'Backspace') {
    e.preventDefault();
    playClickSound('action');
    handleBackspace();
  } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
    playClickSound('action');
    handleKeyPress('clear');
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    playClickSound('equals');
    evaluateExpression();
  } else if (e.key === '%') {
    playClickSound('operator');
    handleKeyPress('percent');
  } else if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(e.key)) {
    playClickSound('num');
    handleKeyPress(e.key);
  } else if (['+', '-', '*', '/'].includes(e.key)) {
    playClickSound('operator');
    handleKeyPress(e.key);
  } else if (e.key === '(' || e.key === ')') {
    playClickSound('sci');
    handleKeyPress('parentheses');
  } else if (e.key === '^') {
    playClickSound('operator');
    handleKeyPress('^');
  }
}

/* ==========================================================================
   PAYWALL & ACCOUNT LOGIC HANDLERS
   ========================================================================== */
function updateAccountBadge() {
  // Account badge UI removed from header
}

// Payment method tab switching
dom.payTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    dom.payTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const method = tab.dataset.method;
    dom.payForms.forEach(form => {
      if (form.id === `form-${method}`) {
        form.classList.add('active');
      } else {
        form.classList.remove('active');
      }
    });
    
    triggerHaptics();
    playClickSound('action');
  });
});

// Auto formatting: Card Number spacing (xxxx xxxx xxxx xxxx)
dom.cardNumInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  let formatted = '';
  for (let i = 0; i < val.length; i++) {
    if (i > 0 && i % 4 === 0) formatted += ' ';
    formatted += val[i];
  }
  e.target.value = formatted;
});

dom.cardExpiryInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 2) {
    e.target.value = val.slice(0, 2) + '/' + val.slice(2, 4);
  } else {
    e.target.value = val;
  }
});

// Auto formatting: CVC digits only
dom.cardCvcInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

// Card Payment Submission
document.getElementById('form-card').addEventListener('submit', (e) => {
  e.preventDefault();
  processProUpgrade('Card');
});

// Apple Pay Submission
dom.btnPayApple.addEventListener('click', () => {
  processProUpgrade('Apple Pay');
});

// PayPal Submission
dom.btnPayPaypal.addEventListener('click', () => {
  processProUpgrade('PayPal');
});

function processProUpgrade(methodName) {
  triggerHaptics();
  playClickSound('action');

  // Show loading spinner/state
  const btn = methodName === 'Card' ? dom.btnPayCard : (methodName === 'Apple Pay' ? dom.btnPayApple : dom.btnPayPaypal);
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing Payment...`;

  setTimeout(() => {
    // Save Pro status
    state.isPro = true;
    localStorage.setItem('calc-pro', 'true');
    updateAccountBadge();

    // Trigger Success feedback Screen
    dom.successScreen.classList.add('show');
    playSuccessChord();
    triggerHaptics();
  }, 1500);
}

// Success Close screen chimes & resumes previous calculations
dom.btnSuccessClose.addEventListener('click', () => {
  dom.successScreen.classList.remove('show');
  dom.paywallModal.classList.remove('open');
  
  // Re-enable payment submit buttons
  [dom.btnPayCard, dom.btnPayApple, dom.btnPayPaypal].forEach(btn => {
    btn.disabled = false;
  });
  dom.btnPayCard.innerHTML = `<span>Pay $4.99 & Unlock Lifetime Pro</span>`;
  dom.btnPayApple.innerHTML = `<i class="fa-brands fa-apple-pay"></i> Pay with Apple Pay`;
  dom.btnPayPaypal.innerHTML = `<i class="fa-brands fa-paypal"></i> Pay with PayPal`;

  // Clear payment fields
  dom.cardNumInput.value = '';
  dom.cardExpiryInput.value = '';
  dom.cardCvcInput.value = '';

  triggerHaptics();
  playClickSound('equals');
  
  // seamless evaluation trigger
  evaluateExpression();
});



// Chime cascade sound synthesiser for purchase success
function playSuccessChord() {
  if (!state.soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major cascade
    
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gainNode.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.warn('Success chime failed', e);
  }
}

