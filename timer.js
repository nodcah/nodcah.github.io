// Interval Timer App
// Main JavaScript file

class IntervalTimer {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.currentRound = 0;
    this.isWorkoutPhase = true;
    this.intervalId = null;
    this.notificationId = null;
    this.wakeLock = null;
    this.serviceWorkerRegistration = null;
    
    // Settings
    this.settings = {
      soundEnabled: true,
      vibrationEnabled: true,
      halfwayAlert: true,
      backgroundNotifications: true
    };
    
    // Load settings from localStorage
    this.loadSettings();
    
    // Initialize UI
    this.initializeUI();
    
    // Check notification permission on load (silently set flag if already enabled)
    if ('Notification' in window && Notification.permission === 'granted') {
      localStorage.setItem('notificationsAlreadyEnabled', 'true');
    }
    
    // Note: We don't automatically request permission on load
    // User can click the button to request if needed
    
    // Register service worker
    this.registerServiceWorker();
    
    // Setup audio context for sounds
    this.setupAudio();
  }
  
  initializeUI() {
    // Timer display elements
    this.timerTimeEl = document.getElementById('timer-time');
    this.timerLabelEl = document.getElementById('timer-label');
    this.roundInfoEl = document.getElementById('round-info');
    
    // Control buttons
    this.startPauseBtn = document.getElementById('start-pause-btn');
    this.resetBtn = document.getElementById('reset-btn');
    
    // Configuration inputs
    this.workoutTimeRuler = document.getElementById('workout-time-ruler');
    this.restTimeRuler = document.getElementById('rest-time-ruler');
    this.roundsRuler = document.getElementById('rounds-ruler');
    this.workoutNameInput = document.getElementById('workout-name');
    
    // Current values (in seconds for time, count for rounds)
    this.workoutTimeValue = 60; // 1 minute
    this.restTimeValue = 60; // 1 minute
    this.roundsValue = 10; // 10 rounds
    
    // Display values
    this.workoutTimeDisplay = document.getElementById('workout-time-display');
    this.restTimeDisplay = document.getElementById('rest-time-display');
    this.roundsDisplay = document.getElementById('rounds-display');
    
    // Settings
    this.soundEnabledCheckbox = document.getElementById('sound-enabled');
    this.vibrationEnabledCheckbox = document.getElementById('vibration-enabled');
    this.halfwayAlertCheckbox = document.getElementById('halfway-alert');
    this.backgroundNotificationsCheckbox = document.getElementById('background-notifications');
    
    // Panels
    this.settingsPanel = document.getElementById('settings-panel');
    this.historyPanel = document.getElementById('history-panel');
    
    // Event listeners
    this.startPauseBtn.addEventListener('click', () => this.toggleTimer());
    this.resetBtn.addEventListener('click', () => this.resetTimer());
    
    // Initialize ruler sliders
    this.initializeRulerSlider(this.workoutTimeRuler, 'workout', 60);
    this.initializeRulerSlider(this.restTimeRuler, 'rest', 60);
    this.initializeRulerSlider(this.roundsRuler, 'rounds', 10);
    
    // Settings
    this.soundEnabledCheckbox.addEventListener('change', () => this.updateSetting('soundEnabled', this.soundEnabledCheckbox.checked));
    this.vibrationEnabledCheckbox.addEventListener('change', () => this.updateSetting('vibrationEnabled', this.vibrationEnabledCheckbox.checked));
    this.halfwayAlertCheckbox.addEventListener('change', () => this.updateSetting('halfwayAlert', this.halfwayAlertCheckbox.checked));
    this.backgroundNotificationsCheckbox.addEventListener('change', () => this.updateSetting('backgroundNotifications', this.backgroundNotificationsCheckbox.checked));
    
    // Panel toggles
    document.getElementById('settings-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
    document.getElementById('history-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleHistory();
    });
    
    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.floating-panel') && !e.target.closest('.icon-btn')) {
        this.settingsPanel.classList.remove('show');
        this.historyPanel.classList.remove('show');
        setTimeout(() => {
          this.settingsPanel.classList.add('hidden');
          this.historyPanel.classList.add('hidden');
        }, 200);
      }
    });
    document.getElementById('request-permission-btn').addEventListener('click', () => this.requestNotificationPermission());
    document.getElementById('clear-history-btn').addEventListener('click', () => this.clearHistory());
    
    // Update initial display
    this.updateWorkoutTime();
    this.updateRestTime();
    this.updateRounds();
    this.updateSettingsUI();
    this.loadHistory();
    
    // Load saved values
    this.loadRulerValues();
    
    // Prevent screen lock during workout
    this.setupWakeLock();
    
    // Handle visibility changes (when app goes to background)
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  }
  
  setupAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // On iOS, we need to unlock audio with a user interaction
      // Create a silent buffer to unlock audio context
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      // Resume audio context if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('Audio context not supported:', e);
    }
  }
  
  playBeep(frequency = 800, duration = 200) {
    if (!this.settings.soundEnabled) return;
    
    // Ensure audio context exists and is running
    if (!this.audioContext) {
      this.setupAudio();
    }
    
    if (!this.audioContext) return;
    
    // Resume audio context if suspended (iOS requirement)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.playBeepInternal(frequency, duration);
      }).catch(() => {
        // If resume fails, try anyway
        this.playBeepInternal(frequency, duration);
      });
    } else {
      this.playBeepInternal(frequency, duration);
    }
  }
  
  playBeepInternal(frequency = 800, duration = 200) {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Use higher volume for iOS to help bypass mute switch
      gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (e) {
      console.warn('Error playing beep:', e);
    }
  }
  
  vibrate(pattern = [200]) {
    if (!this.settings.vibrationEnabled) return;
    
    // iOS Safari doesn't support the Vibration API
    // Check if vibration is available
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibration not supported:', e);
      }
    } else {
      // Vibration not available (e.g., iOS Safari)
      // Could show visual feedback instead, but for now just silently fail
      console.log('Vibration API not available on this device');
    }
  }
  
  async requestNotificationPermission() {
    // iOS Safari has very limited notification support
    // Notifications only work when the app is installed as a PWA (added to home screen)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    
    if (!('Notification' in window)) {
      if (isIOS && !isStandalone) {
        alert('Notifications are only available when this app is added to your home screen.\n\nTo add: Tap the Share button, then "Add to Home Screen".');
      } else {
        alert('This browser does not support notifications.');
      }
      return;
    }
    
    // Check if notifications were already enabled in a previous session
    const wasAlreadyEnabled = localStorage.getItem('notificationsAlreadyEnabled') === 'true';
    
    if (Notification.permission === 'granted') {
      // Only show message if this is the first time we detect they're enabled
      if (!wasAlreadyEnabled) {
        this.showNotification('Notifications enabled!', 'You will receive alerts during workouts.');
        localStorage.setItem('notificationsAlreadyEnabled', 'true');
      }
      return;
    }
    
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Show message when newly granted
          this.showNotification('Notifications enabled!', 'You will receive alerts during workouts.');
          localStorage.setItem('notificationsAlreadyEnabled', 'true');
        } else if (permission === 'denied' && isIOS && !isStandalone) {
          // Provide helpful message for iOS users
          alert('To enable notifications on iOS, please add this app to your home screen first.\n\nTap the Share button, then "Add to Home Screen".');
        }
      } catch (e) {
        console.warn('Error requesting notification permission:', e);
        if (isIOS && !isStandalone) {
          alert('Notifications require this app to be added to your home screen.\n\nTap the Share button, then "Add to Home Screen".');
        }
      }
    } else if (isIOS && !isStandalone) {
      // Permission was denied, but provide helpful message
      alert('To enable notifications on iOS, please add this app to your home screen first.\n\nTap the Share button, then "Add to Home Screen".');
    }
  }
  
  showNotification(title, body, tag = 'interval-timer') {
    if (!this.settings.backgroundNotifications) return;
    
    // Try to use service worker for better background support
    if (this.serviceWorkerRegistration && Notification.permission === 'granted') {
      this.serviceWorkerRegistration.showNotification(title, {
        body: body,
        icon: 'assets/icon.png',
        badge: 'assets/icon.png',
        tag: tag,
        requireInteraction: false,
        vibrate: this.settings.vibrationEnabled ? [200, 100, 200] : undefined
      });
      return;
    }
    
    // Fallback to regular notifications
    if (Notification.permission === 'granted') {
      const options = {
        body: body,
        icon: 'assets/icon.png',
        badge: 'assets/icon.png',
        tag: tag,
        requireInteraction: false,
        silent: false
      };
      
      if (this.notificationId) {
        // Close previous notification
        this.notificationId.close();
      }
      
      this.notificationId = new Notification(title, options);
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        if (this.notificationId) {
          this.notificationId.close();
          this.notificationId = null;
        }
      }, 5000);
    }
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registered:', registration);
        
        // Send notifications through service worker when in background
        this.serviceWorkerRegistration = registration;
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }
  
  async setupWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock released');
        });
      } catch (err) {
        console.log('Wake lock not available:', err);
      }
    }
  }
  
  async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }
  
  handleVisibilityChange() {
    if (document.hidden && this.isRunning) {
      // App went to background - ensure notifications are working
      if (this.settings.backgroundNotifications && Notification.permission === 'granted') {
        // Notifications will be handled by service worker
      }
    }
  }
  
  getWorkoutTime() {
    return this.workoutTimeValue;
  }
  
  getRestTime() {
    return this.restTimeValue;
  }
  
  getRounds() {
    return this.roundsValue;
  }
  
  getTotalTime() {
    const workoutTime = this.getWorkoutTime();
    const restTime = this.getRestTime();
    const rounds = this.getRounds();
    return (workoutTime + restTime) * rounds - restTime; // Last round doesn't have rest
  }
  
  updateWorkoutTime() {
    const value = this.getWorkoutTime();
    if (value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      this.workoutTimeDisplay.textContent = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    } else {
      this.workoutTimeDisplay.textContent = `${value}s`;
    }
    if (!this.isRunning) {
      this.updateDisplay();
    }
    this.saveRulerValues();
  }
  
  updateRestTime() {
    const value = this.getRestTime();
    if (value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      this.restTimeDisplay.textContent = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    } else {
      this.restTimeDisplay.textContent = `${value}s`;
    }
    if (!this.isRunning) {
      this.updateDisplay();
    }
    this.saveRulerValues();
  }
  
  updateRounds() {
    const value = this.getRounds();
    this.roundsDisplay.textContent = value;
    if (!this.isRunning) {
      this.updateDisplay();
    }
    this.saveRulerValues();
  }
  
  updateDisplay() {
    if (this.isRunning) {
      const time = this.currentTime;
      const minutes = Math.floor(time / 60);
      const seconds = time % 60;
      this.timerTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      const phase = this.isWorkoutPhase ? 'Workout' : 'Rest';
      this.timerLabelEl.textContent = phase;
      
      const round = this.currentRound + 1;
      const totalRounds = this.getRounds();
      this.roundInfoEl.textContent = `Round ${round} of ${totalRounds}`;
    } else {
      const totalTime = this.getTotalTime();
      const minutes = Math.floor(totalTime / 60);
      const seconds = totalTime % 60;
      this.timerTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      this.timerLabelEl.textContent = 'Ready';
      this.roundInfoEl.textContent = '';
    }
  }
  
  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }
  
  startTimer() {
    if (this.isPaused) {
      // Resume from pause
      this.isPaused = false;
    } else {
      // Start fresh
      this.currentRound = 0;
      this.isWorkoutPhase = true;
      this.currentTime = this.getWorkoutTime();
    }
    
    this.isRunning = true;
    this.startPauseBtn.textContent = 'Pause';
    this.startPauseBtn.classList.add('running');
    
    // Request wake lock
    this.setupWakeLock();
    
    // Start interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
    
    this.tick(); // Immediate first tick
  }
  
  pauseTimer() {
    this.isRunning = false;
    this.isPaused = true;
    this.startPauseBtn.textContent = 'Resume';
    this.startPauseBtn.classList.remove('running');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Release wake lock when paused
    this.releaseWakeLock();
  }
  
  resetTimer() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.currentRound = 0;
    this.isWorkoutPhase = true;
    
    this.startPauseBtn.textContent = 'Start';
    this.startPauseBtn.classList.remove('running');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Release wake lock
    this.releaseWakeLock();
    
    // Close any notifications
    if (this.notificationId) {
      this.notificationId.close();
      this.notificationId = null;
    }
    
    this.updateDisplay();
  }
  
  tick() {
    this.currentTime--;
    
    const workoutTime = this.getWorkoutTime();
    const restTime = this.getRestTime();
    const totalRounds = this.getRounds();
    
    // Check for 3 seconds left warning
    if (this.settings.halfwayAlert) {
      if (this.currentTime === 3) {
        this.playBeep(600, 200);
        this.vibrate([150]);
      }
    }
    
    // Check if current phase is done
    if (this.currentTime <= 0) {
      if (this.isWorkoutPhase) {
        // Workout phase done, switch to rest
        if (restTime > 0) {
          this.isWorkoutPhase = false;
          this.currentTime = restTime;
          this.playBeep(400, 600);
          this.vibrate([200, 100, 200]);
          this.showNotification('Rest Time', `Round ${this.currentRound + 1} complete. Rest for ${restTime}s`);
        } else {
          // No rest time, go to next round
          this.currentRound++;
          if (this.currentRound < totalRounds) {
            this.currentTime = workoutTime;
            this.playBeep(400, 600);
            this.vibrate([200, 100, 200]);
          } else {
            // All rounds complete
            this.completeWorkout();
            return;
          }
        }
      } else {
        // Rest phase done, switch to workout
        this.isWorkoutPhase = true;
        this.currentRound++;
        if (this.currentRound < totalRounds) {
          this.currentTime = workoutTime;
          this.playBeep(800, 600);
          this.vibrate([300, 100, 300]);
          this.showNotification('Workout Time', `Round ${this.currentRound + 1} of ${totalRounds}. Go!`);
        } else {
          // All rounds complete
          this.completeWorkout();
          return;
        }
      }
    }
    
    this.updateDisplay();
  }
  
  completeWorkout() {
    this.isRunning = false;
    this.isPaused = false;
    
    this.startPauseBtn.textContent = 'Start';
    this.startPauseBtn.classList.remove('running');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Release wake lock
    this.releaseWakeLock();
    
    // Celebration sounds and vibrations
    this.playBeep(800, 200);
    setTimeout(() => this.playBeep(1000, 200), 200);
    setTimeout(() => this.playBeep(1200, 400), 400);
    this.vibrate([200, 100, 200, 100, 400]);
    
    // Notification
    this.showNotification('Workout Complete!', `Great job! You completed ${this.getRounds()} rounds.`);
    
    // Save to history
    this.saveToHistory();
    
    // Reset display
    this.currentTime = 0;
    this.currentRound = 0;
    this.isWorkoutPhase = true;
    this.updateDisplay();
  }
  
  saveToHistory() {
    const workout = {
      name: this.workoutNameInput.value.trim() || 'Unnamed Workout',
      workoutTime: this.getWorkoutTime(),
      restTime: this.getRestTime(),
      rounds: this.getRounds(),
      date: new Date().toISOString(),
      totalTime: this.getTotalTime()
    };
    
    let history = JSON.parse(localStorage.getItem('timerHistory') || '[]');
    history.unshift(workout); // Add to beginning
    
    // Keep only last 50 workouts
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    localStorage.setItem('timerHistory', JSON.stringify(history));
    this.loadHistory();
  }
  
  loadHistory() {
    const history = JSON.parse(localStorage.getItem('timerHistory') || '[]');
    const historyList = document.getElementById('history-list');
    
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No workouts yet. Start your first workout!</p>';
      return;
    }
    
    historyList.innerHTML = history.map((workout, index) => {
      const date = new Date(workout.date);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const totalMinutes = Math.floor(workout.totalTime / 60);
      const totalSeconds = workout.totalTime % 60;
      
      return `
        <div class="history-item" data-index="${index}">
          <div class="history-item-header">
            <span class="history-item-name">${this.escapeHtml(workout.name)}</span>
            <span class="history-item-date">${dateStr}</span>
          </div>
          <div class="history-item-details">
            ${workout.rounds} rounds • ${workout.workoutTime}s work / ${workout.restTime}s rest • ${totalMinutes}:${String(totalSeconds).padStart(2, '0')} total
          </div>
        </div>
      `;
    }).join('');
    
    // Add click listeners to load workouts
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.loadWorkoutFromHistory(history[index]);
        this.toggleHistory();
      });
    });
  }
  
  loadWorkoutFromHistory(workout) {
    this.workoutTimeValue = workout.workoutTime;
    this.restTimeValue = workout.restTime;
    this.roundsValue = workout.rounds;
    this.workoutNameInput.value = workout.name;
    
    // Update ruler positions
    this.setRulerValue(this.workoutTimeRuler, this.workoutTimeValue, 'workout');
    this.setRulerValue(this.restTimeRuler, this.restTimeValue, 'rest');
    this.setRulerValue(this.roundsRuler, this.roundsValue, 'rounds');
    
    this.updateWorkoutTime();
    this.updateRestTime();
    this.updateRounds();
    this.updateDisplay();
  }
  
  initializeRulerSlider(rulerEl, type, initialValue) {
    const isTimeBased = type === 'workout' || type === 'rest';
    const PIXELS_PER_SECOND = 2; // 2 pixels per second for time-based
    const PIXELS_PER_ROUND = 8; // 8 pixels per round for rounds
    const PIXELS_PER_UNIT = isTimeBased ? PIXELS_PER_SECOND : PIXELS_PER_ROUND;
    
    // Get the center position of the slider (where the indicator is)
    const getCenterPosition = () => {
      const rect = rulerEl.getBoundingClientRect();
      return rect.width / 2;
    };
    
    // Create marks container
    const marksContainer = document.createElement('div');
    marksContainer.className = 'ruler-marks';
    rulerEl.appendChild(marksContainer);
    
    // Create marks (from 0 to +600 units for infinite scroll effect)
    // Don't show marks for negative values
    const markRange = 600;
    const centerPos = getCenterPosition();
    
    for (let i = 0; i <= markRange; i++) {
      const mark = document.createElement('div');
      mark.className = 'ruler-mark';
      
      if (isTimeBased) {
        // For time-based: major marks every 60 seconds (1 minute), medium every 15 seconds
        if (i % 60 === 0) {
          mark.classList.add('major');
        } else if (i % 15 === 0) {
          mark.classList.add('medium');
        }
      } else {
        // For rounds: major marks every 5 rounds, minor every round
        if (i % 5 === 0) {
          mark.classList.add('major');
        }
      }
      
      // Position marks relative to center: center + (i * PIXELS_PER_UNIT)
      mark.style.left = `${centerPos + (i * PIXELS_PER_UNIT)}px`;
      marksContainer.appendChild(mark);
      
      // Add labels for major marks (only non-negative values)
      if (isTimeBased && i % 60 === 0 && i >= 0) {
        const label = document.createElement('div');
        label.className = 'ruler-label';
        if (i === 0) {
          // Show "0s" or "0m" at zero position
          if (type === 'rest') {
            label.textContent = '0s';
          } else {
            label.textContent = '0s';
          }
        } else {
          const minutes = Math.floor(i / 60);
          label.textContent = `${minutes}m`;
        }
        label.style.left = `${centerPos + (i * PIXELS_PER_UNIT)}px`;
        marksContainer.appendChild(label);
      } else if (!isTimeBased && i % 10 === 0 && i >= 1) {
        const label = document.createElement('div');
        label.className = 'ruler-label';
        label.textContent = `${i}`;
        label.style.left = `${centerPos + (i * PIXELS_PER_ROUND)}px`;
        marksContainer.appendChild(label);
      }
    }
    
    // Set initial position
    this.setRulerValue(rulerEl, initialValue, type);
    
    // Touch/mouse handling with momentum
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let currentOffset = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumAnimationId = null;
    let velocities = []; // Track velocities for speed detection
    
    const getOffset = () => {
      const marks = rulerEl.querySelector('.ruler-marks');
      const transform = window.getComputedStyle(marks).transform;
      if (transform && transform !== 'none') {
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
          return parseFloat(matrix[1].split(',')[4]) || 0;
        }
      }
      return 0;
    };
    
    const getValueFromOffset = (offset) => {
      // Calculate value based on center position
      // When offset is 0, mark at position centerPos (value 0) is at center
      // When we translate by -V * PIXELS_PER_UNIT, mark at centerPos + V * PIXELS_PER_UNIT moves to center
      // So: offset = -V * PIXELS_PER_UNIT, therefore V = -offset / PIXELS_PER_UNIT
      let value = Math.round(-offset / PIXELS_PER_UNIT);
      
      // Clamp to prevent negative values
      if (isTimeBased) {
        if (type === 'rest') {
          value = Math.max(0, value);
        } else {
          // Workout time: minimum 1 second
          value = Math.max(1, value);
        }
      } else {
        // Rounds: minimum 1
        value = Math.max(1, value);
      }
      
      return value;
    };
    
    const setOffset = (offset, snap = false, applyGroove = false) => {
      const marks = rulerEl.querySelector('.ruler-marks');
      
      // Calculate current value and clamp offset to prevent negative values
      const value = getValueFromOffset(offset);
      
      // Clamp offset based on minimum value
      // offset = -value * PIXELS_PER_UNIT, so more negative = higher value
      // To prevent negative values, we need to limit how positive offset can be
      let clampedOffset = offset;
      if (isTimeBased) {
        if (type === 'rest') {
          // Rest minimum is 0, so offset can be at most 0 (offset = -0 * PIXELS_PER_UNIT = 0)
          clampedOffset = Math.min(0, offset);
        } else {
          // Workout minimum is 1, so offset can be at most -1 * PIXELS_PER_UNIT
          clampedOffset = Math.min(-1 * PIXELS_PER_UNIT, offset);
        }
      } else {
        // Rounds minimum is 1, so offset can be at most -1 * PIXELS_PER_ROUND
        clampedOffset = Math.min(-1 * PIXELS_PER_ROUND, offset);
      }
      
      if (snap) {
        marks.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      } else {
        marks.style.transition = 'none';
      }
      marks.style.transform = `translateX(${clampedOffset}px)`;
      currentOffset = clampedOffset;
      
      if (type === 'workout') {
        this.workoutTimeValue = value;
        this.updateWorkoutTime();
      } else if (type === 'rest') {
        this.restTimeValue = value;
        this.updateRestTime();
      } else if (type === 'rounds') {
        this.roundsValue = value;
        this.updateRounds();
      }
    };
    
    const getSnapInterval = () => {
      if (!isTimeBased) return 1; // Rounds always snap to 1
      
      // Calculate average velocity over last few samples
      if (velocities.length === 0) return 1;
      const avgVelocity = Math.abs(velocities.reduce((a, b) => a + b, 0) / velocities.length);
      
      // Fast scrolling: snap to 1 minute (60 seconds)
      if (avgVelocity > 1) return 60;
      // Medium scrolling: snap to 15 seconds
      if (avgVelocity > 0.2) return 15;
      // Slow scrolling: snap to 1 second
      return 1;
    };
    
    const snapToInterval = (offset, interval) => {
      const currentValue = getValueFromOffset(offset);
      let snappedValue = Math.round(currentValue / interval) * interval;
      
      // Ensure snapped value is not negative
      if (isTimeBased) {
        if (type === 'rest') {
          snappedValue = Math.max(0, snappedValue);
        } else {
          snappedValue = Math.max(1, snappedValue);
        }
      } else {
        snappedValue = Math.max(1, snappedValue);
      }
      
      return -snappedValue * PIXELS_PER_UNIT;
    };
    
    const handleStart = (clientX) => {
      if (momentumAnimationId) {
        cancelAnimationFrame(momentumAnimationId);
        momentumAnimationId = null;
      }
      isDragging = true;
      startX = clientX;
      lastX = clientX;
      lastTime = Date.now();
      startOffset = getOffset();
      velocity = 0;
      velocities = []; // Reset velocity tracking
      rulerEl.style.cursor = 'grabbing';
    };
    
    const handleMove = (clientX, timestamp) => {
      if (!isDragging) return;
      
      const deltaX = clientX - startX;
      const newOffset = startOffset + deltaX;
      setOffset(newOffset);
      
      // Calculate velocity for momentum and speed detection
      const timeDelta = timestamp - lastTime;
      if (timeDelta > 0) {
        const distanceDelta = clientX - lastX;
        velocity = distanceDelta / timeDelta;
        
        // Track velocities (keep last 10 samples)
        velocities.push(Math.abs(velocity));
        if (velocities.length > 10) {
          velocities.shift();
        }
      }
      lastX = clientX;
      lastTime = timestamp;
      
      // Infinite scroll: reset position when too far from center
      const maxOffset = markRange * PIXELS_PER_UNIT * 0.8;
      if (Math.abs(currentOffset) > maxOffset) {
        const resetOffset = currentOffset % (markRange * PIXELS_PER_UNIT);
        setOffset(resetOffset);
        startOffset = resetOffset;
        startX = clientX;
      }
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      rulerEl.style.cursor = 'grab';
      
      // Determine snap interval based on scroll speed
      const snapInterval = getSnapInterval();
      
      // Apply momentum scrolling
      const friction = 0.95;
      const minVelocity = 0.1;
      
      const animateMomentum = () => {
        if (Math.abs(velocity) < minVelocity) {
          // Momentum ended, snap to nearest interval based on speed
          const finalOffset = snapToInterval(currentOffset, snapInterval);
          setOffset(finalOffset, true);
          momentumAnimationId = null;
          return;
        }
        
        // Apply velocity
        const newOffset = currentOffset + velocity * 16; // 16ms frame time
        setOffset(newOffset);
        
        // Apply friction
        velocity *= friction;
        
        // Check bounds
        const maxOffset = markRange * PIXELS_PER_UNIT * 0.8;
        if (Math.abs(currentOffset) > maxOffset) {
          const resetOffset = currentOffset % (markRange * PIXELS_PER_UNIT);
          setOffset(resetOffset);
          velocity = 0;
        }
        
        momentumAnimationId = requestAnimationFrame(animateMomentum);
      };
      
      if (Math.abs(velocity) > minVelocity) {
        momentumAnimationId = requestAnimationFrame(animateMomentum);
      } else {
        // No momentum, just snap based on speed
        const finalOffset = snapToInterval(currentOffset, snapInterval);
        setOffset(finalOffset, true);
      }
    };
    
    // Touch events
    rulerEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX);
    }, { passive: false });
    
    rulerEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, Date.now());
    }, { passive: false });
    
    rulerEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    }, { passive: false });
    
    // Mouse events
    const mouseMoveHandler = (e) => {
      if (isDragging) {
        handleMove(e.clientX, Date.now());
      }
    };
    
    const mouseUpHandler = () => {
      if (isDragging) {
        handleEnd();
      }
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    rulerEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleStart(e.clientX);
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    });
  }
  
  setRulerValue(rulerEl, value, type) {
    const isTimeBased = type === 'workout' || type === 'rest';
    const PIXELS_PER_SECOND = 2;
    const PIXELS_PER_ROUND = 8;
    const PIXELS_PER_UNIT = isTimeBased ? PIXELS_PER_SECOND : PIXELS_PER_ROUND;
    
    const marks = rulerEl.querySelector('.ruler-marks');
    if (marks) {
      // To show value V at center: translate by -V * PIXELS_PER_UNIT
      // This moves mark at position (centerPos + V * PIXELS_PER_UNIT) to center
      const offset = -value * PIXELS_PER_UNIT;
      marks.style.transform = `translateX(${offset}px)`;
      marks.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }
  
  saveRulerValues() {
    localStorage.setItem('timerRulerValues', JSON.stringify({
      workout: this.workoutTimeValue,
      rest: this.restTimeValue,
      rounds: this.roundsValue
    }));
  }
  
  loadRulerValues() {
    const saved = localStorage.getItem('timerRulerValues');
    if (saved) {
      try {
        const values = JSON.parse(saved);
        this.workoutTimeValue = values.workout || 60;
        this.restTimeValue = values.rest || 60;
        this.roundsValue = values.rounds || 10;
      } catch (e) {
        console.warn('Failed to load ruler values:', e);
        // Use defaults on error
        this.workoutTimeValue = 60;
        this.restTimeValue = 60;
        this.roundsValue = 20;
      }
    } else {
      // No saved values, use defaults
      this.workoutTimeValue = 60;
      this.restTimeValue = 60;
      this.roundsValue = 20;
    }
    
    // Always set ruler positions and update displays
    this.setRulerValue(this.workoutTimeRuler, this.workoutTimeValue, 'workout');
    this.setRulerValue(this.restTimeRuler, this.restTimeValue, 'rest');
    this.setRulerValue(this.roundsRuler, this.roundsValue, 'rounds');
    this.updateWorkoutTime();
    this.updateRestTime();
    this.updateRounds();
  }
  
  clearHistory() {
    if (confirm('Are you sure you want to clear all workout history?')) {
      localStorage.removeItem('timerHistory');
      this.loadHistory();
    }
  }
  
  toggleSettings() {
    const isShowing = this.settingsPanel.classList.contains('show');
    if (isShowing) {
      this.settingsPanel.classList.remove('show');
      setTimeout(() => this.settingsPanel.classList.add('hidden'), 200);
    } else {
      this.historyPanel.classList.remove('show');
      setTimeout(() => this.historyPanel.classList.add('hidden'), 200);
      this.settingsPanel.classList.remove('hidden');
      setTimeout(() => this.settingsPanel.classList.add('show'), 10);
    }
  }
  
  toggleHistory() {
    const isShowing = this.historyPanel.classList.contains('show');
    if (isShowing) {
      this.historyPanel.classList.remove('show');
      setTimeout(() => this.historyPanel.classList.add('hidden'), 200);
    } else {
      this.settingsPanel.classList.remove('show');
      setTimeout(() => this.settingsPanel.classList.add('hidden'), 200);
      this.historyPanel.classList.remove('hidden');
      setTimeout(() => this.historyPanel.classList.add('show'), 10);
    }
  }
  
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
  
  loadSettings() {
    const saved = localStorage.getItem('timerSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }
  
  saveSettings() {
    localStorage.setItem('timerSettings', JSON.stringify(this.settings));
  }
  
  updateSettingsUI() {
    this.soundEnabledCheckbox.checked = this.settings.soundEnabled;
    this.vibrationEnabledCheckbox.checked = this.settings.vibrationEnabled;
    this.halfwayAlertCheckbox.checked = this.settings.halfwayAlert;
    this.backgroundNotificationsCheckbox.checked = this.settings.backgroundNotifications;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.timer = new IntervalTimer();
});

// Handle page visibility for better background support
document.addEventListener('visibilitychange', () => {
  if (document.hidden && window.timer && window.timer.isRunning) {
    // Ensure audio context is resumed when page becomes visible again
    if (window.timer.audioContext && window.timer.audioContext.state === 'suspended') {
      window.timer.audioContext.resume();
    }
  }
});

// Resume audio context on user interaction (required by browsers, especially iOS)
document.addEventListener('click', () => {
  if (window.timer && window.timer.audioContext) {
    if (window.timer.audioContext.state === 'suspended') {
      window.timer.audioContext.resume().catch(() => {
        // Ignore errors, will retry on next interaction
      });
    }
  }
}, { once: false }); // Allow multiple clicks to resume if needed

// Also try to resume on touchstart for iOS
document.addEventListener('touchstart', () => {
  if (window.timer && window.timer.audioContext && window.timer.audioContext.state === 'suspended') {
    window.timer.audioContext.resume().catch(() => {
      // Ignore errors
    });
  }
}, { once: false });

