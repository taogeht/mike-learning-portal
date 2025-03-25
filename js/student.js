// Student Portal JavaScript
console.log('Student.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  
  // Initialize the student portal
  initStudentPortal();
});

// Global variables
let currentClass = null;
let currentStudent = null;
let isFirstTimeLogin = false;
let vocabularyLists = [];

/**
 * Initialize the student portal
 */
async function initStudentPortal() {
  try {
    console.log('Initializing student portal');
    
    // Get class slug from query parameter instead of URL path
    const urlParams = new URLSearchParams(window.location.search);
    const classSlug = urlParams.get('class');
    
    console.log('Class slug from URL:', classSlug);
    
    // If no class slug is provided, show error
    if (!classSlug || classSlug === '') {
      showSection('class-not-found');
      return;
    }
    
    // Look up class by slug
    await lookupClass(classSlug);
    
    // Check if student is already logged in
    const savedSession = localStorage.getItem('studentSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Verify the session is for the current class
        if (session.classId === currentClass.id) {
          console.log('Restoring student session from local storage');
          // Get the latest student data to ensure it's current
          const { data, error } = await window.supabaseClient
            .from('students')
            .select('*')
            .eq('id', session.studentId)
            .single();
            
          if (error) throw error;
          
          if (data) {
            currentStudent = data;
            console.log('Student session restored:', currentStudent.name);
            await showStudentDashboard();
            return;
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
        localStorage.removeItem('studentSession');
      }
    }
    
    // Initialize UI components
    initUI();
  } catch (error) {
    console.error('Error initializing student portal:', error);
    showAlert('Error initializing student portal: ' + error.message, 'error');
  }
}

/**
 * Look up a class by its slug
 * @param {string} slug - The class slug to look up
 */
async function lookupClass(slug) {
  try {
    console.log('Looking up class with slug:', slug);
    
    const { data, error } = await window.supabaseClient
      .from('classes')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      console.error('No class found with slug:', slug);
      showSection('class-not-found');
      return;
    }
    
    console.log('Found class:', data);
    currentClass = data;
    
    // Load students for this class
    await loadStudents(data.id);
    
    // Show student selection section
    showSection('student-selection');
  } catch (error) {
    console.error('Error looking up class:', error);
    showAlert('Error looking up class: ' + error.message, 'error');
  }
}

/**
 * Initialize UI components and event listeners
 */
function initUI() {
  // Submit passcode button
  document.getElementById('submit-passcode').addEventListener('click', handlePasscodeSubmit);
  
  // Passcode input enter key
  document.getElementById('passcode-input').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handlePasscodeSubmit();
    }
  });
  
  // Home button
  const homeButton = document.getElementById('home-button');
  if (homeButton) {
    homeButton.addEventListener('click', handleHomeNavigation);
  }
  
  // Note: Dashboard buttons (view lists, leaderboard, logout) are initialized 
  // in initDashboardEventListeners() when the dashboard is shown
}

/**
 * Show an alert message
 * @param {string} message - The message to display
 * @param {string} type - The type of alert ('success', 'error', 'info')
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'alert-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    alertContainer.removeChild(alertElement);
  });
  
  alertElement.appendChild(closeButton);
  alertContainer.appendChild(alertElement);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alertContainer.contains(alertElement)) {
      alertContainer.removeChild(alertElement);
    }
  }, 5000);
}

// Expose showAlert globally
window.showAlert = showAlert;

/**
 * Show a specific section and hide others
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(sectionId) {
  // Hide all sections
  const sections = [
    'class-not-found',
    'student-selection',
    'passcode-entry',
    'student-dashboard'
  ];
  
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      section.classList.add('hidden');
    }
  });
  
  // Show the requested section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
  }
}

/**
 * Load students for a class
 * @param {string} classId - The ID of the class
 */
async function loadStudents(classId) {
  try {
    console.log('Loading students for class:', classId);
    
    // Get students for this class
    const { data, error } = await window.supabaseClient
      .from('class_students')
      .select(`
        id,
        students (
          id,
          name,
          email,
          passcode
        )
      `)
      .eq('class_id', classId);
    
    if (error) throw error;
    
    // Extract student data
    const students = data.map(item => ({
      id: item.students.id,
      name: item.students.name,
      email: item.students.email,
      passcode: item.students.passcode,
      class_student_id: item.id
    }));
    
    console.log(`Loaded ${students.length} students`);
    
    renderStudentButtons(students);
  } catch (error) {
    console.error('Error loading students:', error);
    showAlert('Error loading students: ' + error.message, 'error');
  }
}

/**
 * Render student buttons in the UI
 * @param {Array} students - Array of student objects
 */
function renderStudentButtons(students) {
  const studentsGrid = document.getElementById('students-grid');
  
  // Clear existing content
  studentsGrid.innerHTML = '';
  
  if (students.length === 0) {
    const message = document.createElement('p');
    message.className = 'text-center';
    message.textContent = 'No students found in this class.';
    studentsGrid.appendChild(message);
    return;
  }
  
  // Create student buttons
  students.forEach(student => {
    const button = document.createElement('div');
    button.className = 'student-button';
    button.textContent = student.name;
    button.setAttribute('data-student-id', student.id);
    button.setAttribute('data-student-name', student.name);
    button.setAttribute('data-has-passcode', student.passcode ? 'true' : 'false');
    
    button.addEventListener('click', () => {
      selectStudent(student);
    });
    
    studentsGrid.appendChild(button);
  });
}

/**
 * Handle student selection
 * @param {Object} student - The selected student object
 */
function selectStudent(student) {
  console.log('Student selected:', student);
  
  currentStudent = student;
  
  // Update UI
  document.getElementById('selected-student-name').textContent = student.name;
  
  // Check if this is the first time login
  isFirstTimeLogin = !student.passcode;
  
  // Show/hide first time message
  const firstTimeMessage = document.getElementById('first-time-message');
  if (isFirstTimeLogin) {
    firstTimeMessage.classList.remove('hidden');
  } else {
    firstTimeMessage.classList.add('hidden');
  }
  
  // Clear any previous error
  document.getElementById('passcode-error').classList.add('hidden');
  
  // Clear passcode input
  document.getElementById('passcode-input').value = '';
  
  // Show passcode entry section
  showSection('passcode-entry');
  
  // Focus on passcode input
  setTimeout(() => {
    document.getElementById('passcode-input').focus();
  }, 100);
}

/**
 * Handle passcode submission
 */
async function handlePasscodeSubmit() {
  const passcodeInput = document.getElementById('passcode-input');
  const passcode = passcodeInput.value.trim();
  
  if (!passcode) {
    showAlert('Please enter a passcode', 'error');
    return;
  }
  
  // Validate passcode is a single digit
  if (!/^\d$/.test(passcode)) {
    showAlert('Passcode must be a single digit (0-9)', 'error');
    return;
  }
  
  try {
    if (isFirstTimeLogin) {
      // First time login, set passcode
      await setStudentPasscode(currentStudent.id, passcode);
    } else {
      // Verify passcode
      const isValid = await verifyPasscode(currentStudent.id, passcode);
      
      if (!isValid) {
        document.getElementById('passcode-error').classList.remove('hidden');
        passcodeInput.value = '';
        passcodeInput.focus();
        return;
      }
    }
    
    // Passcode is valid, show dashboard
    showStudentDashboard();
  } catch (error) {
    console.error('Error handling passcode:', error);
    showAlert('Error processing passcode: ' + error.message, 'error');
  }
}

/**
 * Set a student's passcode
 * @param {string} studentId - The student ID
 * @param {string} passcode - The passcode to set
 */
async function setStudentPasscode(studentId, passcode) {
  try {
    console.log('Setting passcode for student:', studentId);
    
    const { error } = await window.supabaseClient
      .from('students')
      .update({ passcode })
      .eq('id', studentId);
    
    if (error) throw error;
    
    console.log('Passcode set successfully');
    
    // Update current student object
    currentStudent.passcode = passcode;
    isFirstTimeLogin = false;
  } catch (error) {
    console.error('Error setting passcode:', error);
    throw error;
  }
}

/**
 * Verify a student's passcode
 * @param {string} studentId - The student ID
 * @param {string} passcode - The passcode to verify
 * @returns {Promise<boolean>} - Whether the passcode is valid
 */
async function verifyPasscode(studentId, passcode) {
  try {
    console.log('Verifying passcode for student:', studentId);
    
    const { data, error } = await window.supabaseClient
      .from('students')
      .select('passcode')
      .eq('id', studentId)
      .single();
    
    if (error) throw error;
    
    const isValid = data.passcode === passcode;
    console.log('Passcode valid:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying passcode:', error);
    throw error;
  }
}

/**
 * Show the student dashboard
 */
async function showStudentDashboard() {
  try {
    // Update UI with student name
    document.getElementById('dashboard-student-name').textContent = currentStudent.name;
    
    // Show dashboard section
    showSection('student-dashboard');
    
    // Save student session
    saveStudentSession();
    
    // Initialize dashboard UI event listeners
    initDashboardEventListeners();
    
    // Load vocabulary lists
    await loadVocabularyLists(currentClass.id);
    
    // Load leaderboard data
    await loadLeaderboard(currentClass.id);
  } catch (error) {
    console.error('Error showing student dashboard:', error);
    showAlert('Error loading dashboard: ' + error.message, 'error');
  }
}

/**
 * Initialize dashboard UI event listeners
 */
function initDashboardEventListeners() {
  // View vocabulary lists button
  const viewListsBtn = document.getElementById('view-vocabulary-lists');
  if (viewListsBtn) {
    // Remove any existing listeners to prevent duplicates
    const newViewListsBtn = viewListsBtn.cloneNode(true);
    viewListsBtn.parentNode.replaceChild(newViewListsBtn, viewListsBtn);
    newViewListsBtn.addEventListener('click', toggleVocabularyListsSection);
  }
  
  // View leaderboard button
  const viewLeaderboardBtn = document.getElementById('view-leaderboard');
  if (viewLeaderboardBtn) {
    // Remove any existing listeners to prevent duplicates
    const newViewLeaderboardBtn = viewLeaderboardBtn.cloneNode(true);
    viewLeaderboardBtn.parentNode.replaceChild(newViewLeaderboardBtn, viewLeaderboardBtn);
    newViewLeaderboardBtn.addEventListener('click', toggleLeaderboardSection);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    // Remove any existing listeners to prevent duplicates
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.addEventListener('click', handleLogout);
  }
}

/**
 * Save student session to localStorage
 */
function saveStudentSession() {
  try {
    const session = {
      studentId: currentStudent.id,
      classId: currentClass.id,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('studentSession', JSON.stringify(session));
    console.log('Student session saved to localStorage');
  } catch (error) {
    console.error('Error saving student session:', error);
  }
}

/**
 * Handle student logout
 */
function handleLogout() {
  localStorage.removeItem('studentSession');
  currentStudent = null;
  showSection('student-selection');
  console.log('Student logged out');
  showAlert('You have been logged out', 'info');
}

/**
 * Load vocabulary lists for a class
 * @param {string} classId - The ID of the class
 */
async function loadVocabularyLists(classId) {
  try {
    console.log('Loading vocabulary lists for class:', classId);
    
    const { data, error } = await window.supabaseClient
      .from('vocabulary_lists')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Loaded ${data.length} vocabulary lists`);
    
    // Update count in dashboard
    document.getElementById('total-vocabulary-lists').textContent = data.length;
    
    // Store lists for later rendering
    vocabularyLists = data;
  } catch (error) {
    console.error('Error loading vocabulary lists:', error);
    throw error;
  }
}

/**
 * Toggle the vocabulary lists section visibility
 */
function toggleVocabularyListsSection() {
  const vocabularyListsSection = document.getElementById('vocabulary-lists-section');
  const leaderboardSection = document.getElementById('leaderboard-section');
  
  // Clean up any running activities
  cleanupActivities();
  
  if (vocabularyListsSection.classList.contains('hidden')) {
    // Hide leaderboard section if visible
    leaderboardSection.classList.add('hidden');
    
    // Show vocabulary lists section
    vocabularyListsSection.classList.remove('hidden');
    
    // Render lists
    renderVocabularyLists(vocabularyLists);
  } else {
    // Hide vocabulary lists section
    vocabularyListsSection.classList.add('hidden');
  }
}

/**
 * Render vocabulary lists in the UI
 * @param {Array} lists - Array of vocabulary list objects
 */
function renderVocabularyLists(lists) {
  const listsContainer = document.getElementById('vocabulary-lists-container');
  const noListsMessage = document.getElementById('no-vocabulary-lists-message');
  
  // Clear existing content
  listsContainer.innerHTML = '';
  
  if (lists.length === 0) {
    noListsMessage.classList.remove('hidden');
    return;
  }
  
  noListsMessage.classList.add('hidden');
  
  // Create list cards
  lists.forEach(list => {
    const listCard = document.createElement('div');
    listCard.className = 'vocabulary-list-card';
    listCard.innerHTML = `
      <div class="vocabulary-list-card-header">
        <h3>${list.name}</h3>
      </div>
      <div class="vocabulary-list-card-body">
        <button class="btn view-vocabulary-words-btn" data-list-id="${list.id}">View Words</button>
      </div>
    `;
    
    listsContainer.appendChild(listCard);
    
    // Add event listener
    listCard.querySelector('.view-vocabulary-words-btn').addEventListener('click', () => {
      viewVocabularyList(list.id, list.name);
    });
  });
}

/**
 * View a vocabulary list
 * @param {string} listId - The ID of the list to view
 * @param {string} listName - The name of the list
 */
async function viewVocabularyList(listId, listName) {
  try {
    console.log('Viewing vocabulary list:', listId);
    
    // Load vocabulary words
    const { data, error } = await window.supabaseClient
      .from('vocabulary_words')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Loaded ${data.length} vocabulary words`);
    
    // Create a modal for viewing
    const modalHTML = `
      <div id="vocabulary-list-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>${listName}</h2>
          <div class="vocabulary-activities">
            <button class="btn activity-btn" id="spelling-activity-btn">
              <i class="fas fa-spell-check"></i> Spelling
            </button>
            <button class="btn activity-btn" id="matching-game-btn">
              <i class="fas fa-puzzle-piece"></i> Matching
            </button>
            <button class="btn activity-btn" id="picture-quiz-btn">
              <i class="fas fa-image"></i> Picture Quiz
            </button>
            <button class="btn activity-btn" id="bubble-pop-btn">
              <i class="fas fa-soap"></i> Bubble Pop
            </button>
          </div>
          <div class="vocabulary-word-grid">
            ${data.length === 0 ? '<p class="text-center">No words in this list yet.</p>' : ''}
            ${data.map(word => `
              <div class="vocabulary-word-card">
                <div class="vocabulary-word-header">
                  <h3>${word.word}</h3>
                </div>
                ${word.image_url ? `
                  <div class="vocabulary-word-image">
                    <img src="${word.image_url}" alt="${word.word}" onerror="this.src='../img/placeholder.png'">
                  </div>
                ` : ''}
                <div class="vocabulary-word-definition">${word.definition || 'No definition'}</div>
                ${word.sample_sentence ? `
                  <div class="vocabulary-word-sample-sentence"><em>"${word.sample_sentence}"</em></div>
                ` : ''}
                ${word.chinese_translation ? `
                  <div class="vocabulary-word-chinese">${word.chinese_translation}</div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('vocabulary-list-modal');
    modal.style.display = 'block';
    
    // Add event listeners to prevent navigation on text clicks
    modal.querySelectorAll('.vocabulary-word-definition, .vocabulary-word-sample-sentence, .vocabulary-word-chinese').forEach(element => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        return false;
      });
    });
    
    // Close button
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Spelling activity button
    const spellingBtn = document.getElementById('spelling-activity-btn');
    spellingBtn.addEventListener('click', () => {
      modal.remove();
      launchSpellingActivity(data, listName);
    });
    
    // Matching Game button
    const matchingBtn = document.getElementById('matching-game-btn');
    matchingBtn.addEventListener('click', () => {
      modal.remove();
      launchMatchingGame(data, listName);
    });
    
    // Picture Quiz button
    const pictureBtn = document.getElementById('picture-quiz-btn');
    pictureBtn.addEventListener('click', () => {
      modal.remove();
      launchPictureQuiz(data, listName);
    });
    
    // Bubble Pop button
    const bubblePopBtn = document.getElementById('bubble-pop-btn');
    bubblePopBtn.addEventListener('click', () => {
      modal.remove();
      launchBubblePopActivity(data, listName);
    });
  } catch (error) {
    console.error('Error viewing vocabulary list:', error);
    showAlert('Error viewing vocabulary list: ' + error.message, 'error');
  }
}

/**
 * Dynamically load a script
 * @param {string} src - The source URL of the script
 * @returns {Promise} - A promise that resolves when the script is loaded
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      console.log(`Script ${src} is already loaded`);
      return resolve();
    }
    
    console.log(`Loading script: ${src}`);
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`Script loaded: ${src}`);
      resolve();
    };
    script.onerror = (error) => {
      console.error(`Error loading script ${src}:`, error);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
}

/**
 * Cleanup any running activities
 */
function cleanupActivities() {
  // Clean up Bubble Pop activity if it exists
  if (window.BubblePopActivity && typeof window.BubblePopActivity.cleanup === 'function') {
    window.BubblePopActivity.cleanup();
  }
  
  // Hide the activity section
  const activitySection = document.getElementById('vocabulary-activity-section');
  if (activitySection) {
    activitySection.classList.add('hidden');
  }
  
  // Add cleanup for other activities as they're implemented with similar patterns
}

/**
 * Launch the spelling activity for a vocabulary list
 * @param {Array} words - Array of vocabulary word objects
 * @param {string} listName - The name of the vocabulary list
 */
function launchSpellingActivity(words, listName) {
  // Clean up any existing activities
  cleanupActivities();
  
  // Randomize the order of words
  const randomizedWords = [...words].sort(() => Math.random() - 0.5);
  
  // Get the student dashboard
  const dashboard = document.getElementById('student-dashboard');
  if (!dashboard) {
    console.error('Student dashboard element not found');
    showAlert('Error: Student dashboard not found.', 'error');
    return;
  }
  
  // Create a new activity section or reset existing one
  let activitySection = document.getElementById('vocabulary-activity-section');
  if (activitySection) {
    // Remove existing activity section to avoid conflicts
    activitySection.remove();
  }
  
  // Create a new activity section
  activitySection = document.createElement('div');
  activitySection.id = 'vocabulary-activity-section';
  activitySection.className = 'activity-section';
  
  // Create activity HTML
  activitySection.innerHTML = `
    <div class="activity-header">
      <h2 class="activity-title">Spelling Practice: <span id="activity-list-name">${listName}</span></h2>
      <span id="activity-level">Level 1</span>
    </div>
    
    <p id="activity-instructions">Tap the letters to spell the word shown.</p>
    
    <div class="level-selectors">
      <button class="level-selector active" data-level="1">Level 1</button>
      <button class="level-selector" data-level="2">Level 2</button>
      <button class="level-selector" data-level="3">Level 3</button>
    </div>
    
    <div id="spelling-activity-container" class="spelling-activity-container">
      <div id="activity-progress" class="activity-progress">Word 1 of ${randomizedWords.length}</div>
      
      <div id="word-display" class="word-display"></div>
      
      <div id="word-image" class="word-image"></div>
      
      <div id="letter-container" class="letter-container"></div>
      
      <div id="input-container" class="input-container"></div>
    </div>
    
    <div id="results-container" class="results-container hidden">
      <h2 class="results-title">Activity Complete!</h2>
      <div id="activity-score" class="activity-score">0/0 (0%)</div>
      <div class="results-buttons">
        <button id="try-again-btn" class="btn">Try Again</button>
        <button id="back-to-list-btn" class="btn btn-secondary">Back to List</button>
      </div>
    </div>
    
    <div id="feedback-message" class="feedback-message"></div>
  `;
  
  // Add the new activity section to the dashboard
  dashboard.appendChild(activitySection);
  console.log('New activity section created and appended to dashboard');
  
  // Hide lists section
  const listsSection = document.getElementById('vocabulary-lists-section');
  if (listsSection) {
    listsSection.classList.add('hidden');
  }
  
  // Hide leaderboard section
  const leaderboardSection = document.getElementById('leaderboard-section');
  if (leaderboardSection) {
    leaderboardSection.classList.add('hidden');
  }
  
  // Show activity section
  activitySection.classList.remove('hidden');
  
  console.log('Activity section is now visible');
  
  // Initialize the spelling activity with randomized words
  setTimeout(() => {
    if (window.SpellingActivities && typeof window.SpellingActivities.initSpellingActivity === 'function') {
      console.log('SpellingActivities found, initializing...');
      window.SpellingActivities.initSpellingActivity(randomizedWords, 1);
    } else {
      console.warn('SpellingActivities not found, attempting to load script...');
      
      // Set up pending initialization for when the script loads
      window.pendingSpellingInit = {
        words: randomizedWords,
        level: 1
      };
      
      // Try to load the script dynamically
      loadScript('../js/spelling-activities.js')
        .then(() => {
          console.log('Spelling activities script loaded dynamically');
          // Check if SpellingActivities is now available
          if (window.SpellingActivities && typeof window.SpellingActivities.initSpellingActivity === 'function') {
            console.log('SpellingActivities found after dynamic loading, initializing...');
            window.SpellingActivities.initSpellingActivity(randomizedWords, 1);
            window.pendingSpellingInit = null;
          } else {
            console.error('SpellingActivities still not found after dynamic loading');
            showAlert('Error initializing spelling activity. Please refresh the page and try again.', 'error');
          }
        })
        .catch(error => {
          console.error('Failed to load spelling activities script:', error);
          showAlert('Error loading spelling activity. Please refresh the page and try again.', 'error');
        });
    }
  }, 100); // Increased timeout to ensure DOM is ready
}

/**
 * Launch the matching game for a vocabulary list
 * @param {Array} words - Array of vocabulary word objects
 * @param {string} listName - The name of the vocabulary list
 */
function launchMatchingGame(words, listName) {
  console.log('Launching Matching Game with', words.length, 'words');
  
  // Clean up any existing activities
  cleanupActivities();
  
  // Filter words that have images
  const wordsWithImages = words.filter(word => word.image_url);
  
  // We need at least 3 words with images for a meaningful game
  if (wordsWithImages.length < 3) {
    showAlert('Not enough words with images for the matching game. Add more images to your vocabulary words.', 'error');
    return;
  }
  
  // Use up to 8 words for the game (16 cards total)
  const gameWords = wordsWithImages.slice(0, 8);
  
  // Randomize the order
  const randomizedWords = [...gameWords].sort(() => Math.random() - 0.5);
  
  // Remove existing activity section if it exists
  let activitySection = document.getElementById('vocabulary-activity-section');
  if (activitySection) {
    activitySection.remove();
  }
  
  // Create a new activity section
  activitySection = document.createElement('div');
  activitySection.id = 'vocabulary-activity-section';
  
  // Create activity HTML
  activitySection.innerHTML = `
    <div class="activity-header">
      <h2 class="activity-title">Matching Game: <span id="activity-list-name">${listName}</span></h2>
    </div>
    
    <p id="activity-instructions">Match the words with their pictures. Click on cards to flip them.</p>
    
    <div id="matching-game-container" class="matching-game-container">
      <div id="game-stats" class="game-stats">
        <div>Matches: <span id="matches-count">0</span>/<span id="total-pairs">${randomizedWords.length}</span></div>
        <div>Attempts: <span id="attempts-count">0</span></div>
      </div>
      
      <div id="matching-cards" class="matching-cards"></div>
    </div>
    
    <div id="results-container" class="results-container hidden">
      <h2 class="results-title">Game Complete!</h2>
      <div id="game-score" class="activity-score"></div>
      <div class="results-buttons">
        <button id="try-again-btn" class="btn">Play Again</button>
        <button id="back-to-list-btn" class="btn btn-secondary">Back to List</button>
      </div>
    </div>
  `;
  
  // Add to the dashboard
  document.getElementById('student-dashboard').appendChild(activitySection);
  
  // Hide lists section
  document.getElementById('vocabulary-lists-section').classList.add('hidden');
  
  // Show activity section
  activitySection.classList.remove('hidden');
  
  // Initialize the matching game
  initMatchingGame(randomizedWords);
}

/**
 * Initialize the matching game
 * @param {Array} words - Array of vocabulary word objects
 */
function initMatchingGame(words) {
  console.log('Initializing matching game with', words.length, 'words');
  
  // Game state variables
  let flippedCards = [];
  let matchedPairs = 0;
  let attempts = 0;
  let isProcessing = false;
  
  // Create cards array with word cards and image cards
  const cards = [];
  
  // Add word cards
  words.forEach(word => {
    cards.push({
      id: `word-${word.id}`,
      type: 'word',
      word: word.word,
      matchId: word.id
    });
  });
  
  // Add image cards
  words.forEach(word => {
    cards.push({
      id: `image-${word.id}`,
      type: 'image',
      imageUrl: word.image_url || '../img/placeholder.png',
      matchId: word.id
    });
  });
  
  // Shuffle the cards
  const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
  
  // Render cards
  renderCards(shuffledCards);
  
  // Add event listeners for game controls
  document.getElementById('try-again-btn').addEventListener('click', () => {
    // Reset and restart the game
    document.getElementById('results-container').classList.add('hidden');
    initMatchingGame(words);
  });
  
  document.getElementById('back-to-list-btn').addEventListener('click', () => {
    // Go back to vocabulary lists
    document.getElementById('vocabulary-activity-section').classList.add('hidden');
    document.getElementById('vocabulary-lists-section').classList.remove('hidden');
    
    // Refresh the leaderboard
    if (currentClass) {
      loadLeaderboard(currentClass.id);
    }
  });
  
  /**
   * Render the cards on the game board
   * @param {Array} cardsArray - Array of card objects
   */
  function renderCards(cardsArray) {
    const cardsContainer = document.getElementById('matching-cards');
    cardsContainer.innerHTML = '';
    
    cardsArray.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'matching-card';
      cardElement.dataset.id = card.id;
      cardElement.dataset.matchId = card.matchId;
      cardElement.dataset.type = card.type;
      
      // Card front (hidden content)
      const cardFront = document.createElement('div');
      cardFront.className = 'card-front';
      
      // Card back (visible when flipped)
      const cardBack = document.createElement('div');
      cardBack.className = 'card-back';
      
      if (card.type === 'word') {
        cardBack.textContent = card.word;
      } else {
        const img = document.createElement('img');
        img.src = card.imageUrl;
        img.alt = 'Vocabulary image';
        img.onerror = function() {
          this.src = '../img/placeholder.png';
        };
        cardBack.appendChild(img);
      }
      
      cardElement.appendChild(cardFront);
      cardElement.appendChild(cardBack);
      
      // Add click event
      cardElement.addEventListener('click', () => handleCardClick(cardElement));
      
      cardsContainer.appendChild(cardElement);
    });
    
    // Reset game stats
    document.getElementById('matches-count').textContent = '0';
    document.getElementById('attempts-count').textContent = '0';
  }
  
  /**
   * Handle card click
   * @param {HTMLElement} card - The clicked card element
   */
  function handleCardClick(card) {
    // Ignore clicks if processing or card is already flipped or matched
    if (isProcessing || card.classList.contains('flipped') || card.classList.contains('matched')) {
      return;
    }
    
    // Flip the card
    card.classList.add('flipped');
    
    // Add to flipped cards
    flippedCards.push(card);
    
    // If we have 2 flipped cards, check for a match
    if (flippedCards.length === 2) {
      isProcessing = true;
      attempts++;
      document.getElementById('attempts-count').textContent = attempts;
      
      const card1 = flippedCards[0];
      const card2 = flippedCards[1];
      
      // Check if the cards match
      if (card1.dataset.matchId === card2.dataset.matchId && card1.dataset.type !== card2.dataset.type) {
        // Match found
        setTimeout(() => {
          card1.classList.add('matched');
          card2.classList.add('matched');
          
          // Play success sound
          playSound('success');
          
          // Track correct match
          const wordId = parseInt(card1.dataset.matchId);
          trackActivityResult(wordId, 'matching_game', true, 1);
          
          // Update matches count
          matchedPairs++;
          document.getElementById('matches-count').textContent = matchedPairs;
          
          // Check if game is complete
          if (matchedPairs === words.length) {
            gameComplete();
          }
          
          // Reset for next turn
          flippedCards = [];
          isProcessing = false;
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          // Play error sound
          playSound('error');
          
          // Track incorrect match attempt
          // Use the matchId from the first card as the word ID for tracking
          const wordId = parseInt(card1.dataset.matchId);
          trackActivityResult(wordId, 'matching_game', false, 0);
          
          // Flip cards back
          card1.classList.remove('flipped');
          card2.classList.remove('flipped');
          
          // Reset for next turn
          flippedCards = [];
          isProcessing = false;
        }, 1000);
      }
    }
  }
  
  /**
   * Play a sound effect
   * @param {string} type - The type of sound ('success' or 'error')
   */
  function playSound(type) {
    // Create audio element
    const audio = new Audio();
    
    if (type === 'success') {
      audio.src = '../sounds/success.mp3';
    } else {
      audio.src = '../sounds/error.mp3';
    }
    
    // Fallback if sound files don't exist
    audio.onerror = function() {
      console.log('Sound file not found');
    };
    
    // Play the sound
    audio.play().catch(e => {
      console.log('Could not play sound:', e);
    });
  }
  
  /**
   * Handle game completion
   */
  function gameComplete() {
    console.log('Game complete!');
    
    // Calculate score
    const score = Math.round((words.length / attempts) * 100);
    
    // Update score display
    document.getElementById('game-score').textContent = 
      `You found all ${words.length} pairs in ${attempts} attempts (Score: ${score}%)`;
    
    // Show results
    setTimeout(() => {
      document.getElementById('results-container').classList.remove('hidden');
    }, 1000);
  }
}

/**
 * Launch the bubble pop spelling activity for a vocabulary list
 * @param {Array} words - Array of vocabulary word objects
 * @param {string} listName - The name of the vocabulary list
 */
function launchBubblePopActivity(words, listName) {
  console.log('Launching Bubble Pop Activity with', words.length, 'words');
  
  // Clean up any existing activities
  cleanupActivities();
  
  // Randomize the order of words
  const randomizedWords = [...words].sort(() => Math.random() - 0.5);
  
  // Remove existing activity section if it exists
  let activitySection = document.getElementById('vocabulary-activity-section');
  if (activitySection) {
    activitySection.remove();
  }
  
  // Create a new activity section
  activitySection = document.createElement('div');
  activitySection.id = 'vocabulary-activity-section';
  
  // Create activity HTML
  activitySection.innerHTML = `
    <div class="activity-header">
      <h2 class="activity-title">Bubble Pop: <span id="activity-list-name">${listName}</span></h2>
    </div>
    
    <p id="activity-instructions">Pop the bubbles with the correct letters to spell the word!</p>
    
    <div id="bubble-pop-container" class="bubble-pop-container">
      <div id="activity-progress" class="activity-progress">Word 1 of ${randomizedWords.length}</div>
      
      <div id="word-display" class="word-display"></div>
      
      <div id="word-image" class="word-image"></div>
      
      <div id="bubble-container" class="bubble-container"></div>
      
      <div id="word-progress" class="word-progress"></div>
    </div>
    
    <div id="results-container" class="results-container hidden">
      <h2 class="results-title">Activity Complete!</h2>
      <div id="activity-score" class="activity-score">0/0 (0%)</div>
      <div class="results-buttons">
        <button id="try-again-btn" class="btn">Try Again</button>
        <button id="back-to-list-btn" class="btn btn-secondary">Back to List</button>
      </div>
    </div>
    
    <div id="feedback-message" class="feedback-message"></div>
  `;
  
  // Add to the dashboard
  document.getElementById('student-dashboard').appendChild(activitySection);
  
  // Hide lists section
  document.getElementById('vocabulary-lists-section').classList.add('hidden');
  
  // Show activity section
  activitySection.classList.remove('hidden');
  
  // Initialize the bubble pop activity
  window.BubblePopActivity.initBubblePopActivity(randomizedWords);
}

/**
 * Track student activity results
 * @param {string} wordId - The vocabulary word ID
 * @param {string} activityType - The type of activity ('spelling', 'matching', 'picture_quiz', 'bubble_pop')
 * @param {boolean} isCorrect - Whether the student answered correctly
 * @param {number} attemptCount - Number of attempts made (default: 1)
 * @returns {Promise<void>}
 */
async function trackActivityResult(wordId, activityType, isCorrect, attemptCount = 1) {
  try {
    // Validate required data
    if (!currentStudent || !currentStudent.id) {
      console.warn('Cannot track activity result: missing student ID');
      return;
    }
    if (!currentClass || !currentClass.id) {
      console.warn('Cannot track activity result: missing class ID');
      return;
    }
    if (!wordId) {
      console.warn('Cannot track activity result: missing word ID');
      return;
    }

    // Validate student is in the class
    const { data: classStudent, error: classStudentError } = await window.supabaseClient
      .from('class_students')
      .select('id')
      .eq('student_id', currentStudent.id)
      .eq('class_id', currentClass.id)
      .single();

    if (classStudentError || !classStudent) {
      console.error('Student is not in this class');
      return;
    }
    
    console.log(`Tracking ${activityType} result for word ${wordId}: ${isCorrect ? 'correct' : 'incorrect'} (${attemptCount} attempts)`);
    
    const { error } = await window.supabaseClient
      .from('activity_results')
      .insert({
        student_id: currentStudent.id,
        class_id: currentClass.id,
        vocabulary_word_id: wordId,
        activity_type: activityType,
        is_correct: isCorrect,
        attempt_count: attemptCount
      });
    
    if (error) {
      console.error('Error tracking activity result:', error);
    } else {
      // Refresh the leaderboard if we're showing it
      const leaderboardSection = document.getElementById('leaderboard-section');
      if (leaderboardSection && !leaderboardSection.classList.contains('hidden')) {
        loadLeaderboard(currentClass.id);
      }
    }
  } catch (error) {
    console.error('Error in trackActivityResult:', error);
  }
}

/**
 * Toggle the leaderboard section visibility
 */
function toggleLeaderboardSection() {
  const leaderboardSection = document.getElementById('leaderboard-section');
  const vocabularyListsSection = document.getElementById('vocabulary-lists-section');
  
  // Clean up any running activities
  cleanupActivities();
  
  if (leaderboardSection.classList.contains('hidden')) {
    // Hide vocabulary lists section if visible
    vocabularyListsSection.classList.add('hidden');
    
    // Show leaderboard section
    leaderboardSection.classList.remove('hidden');
  } else {
    // Hide leaderboard section
    leaderboardSection.classList.add('hidden');
  }
}

/**
 * Load leaderboard data for a class
 * @param {string} classId - The ID of the class
 */
async function loadLeaderboard(classId) {
  try {
    console.log('Loading leaderboard for class:', classId);
    
    // Get all students in this class
    const { data: studentsData, error: studentsError } = await window.supabaseClient
      .from('class_students')
      .select(`
        id,
        students (
          id,
          name
        )
      `)
      .eq('class_id', classId);
    
    if (studentsError) throw studentsError;
    
    // Update student count in the dashboard card
    document.getElementById('total-students-leaderboard').textContent = studentsData.length;
    
    // Get student IDs for this class
    const studentIds = studentsData.map(item => item.students.id);
    
    if (studentIds.length === 0) {
      document.getElementById('no-leaderboard-message').classList.remove('hidden');
      return;
    }
    
    // Get activity results for these students
    const { data: resultsData, error: resultsError } = await window.supabaseClient
      .from('activity_results')
      .select('*')
      .in('student_id', studentIds);
    
    if (resultsError) throw resultsError;
    
    console.log(`Loaded ${resultsData.length} activity results for leaderboard`);
    
    // Check if we have results
    if (resultsData.length === 0) {
      document.getElementById('no-leaderboard-message').classList.remove('hidden');
      return;
    }
    
    // Hide no results message
    document.getElementById('no-leaderboard-message').classList.add('hidden');
    
    // Calculate scores for each student
    const studentScores = calculateStudentScores(resultsData, studentsData);
    
    // Render the leaderboard
    renderLeaderboard(studentScores);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    showAlert('Error loading leaderboard: ' + error.message, 'error');
    document.getElementById('no-leaderboard-message').classList.remove('hidden');
  }
}

/**
 * Calculate scores for each student based on activity results
 * @param {Array} results - Array of activity result objects
 * @param {Array} students - Array of student objects
 * @returns {Array} - Array of student score objects sorted by score
 */
function calculateStudentScores(results, students) {
  // Create a map of student IDs to student objects
  const studentMap = {};
  students.forEach(item => {
    const studentId = item.students.id;
    studentMap[studentId] = {
      id: studentId,
      name: item.students.name,
      totalAttempts: 0,
      correctAnswers: 0,
      score: 0
    };
  });
  
  // Process activity results
  results.forEach(result => {
    const studentId = result.student_id;
    
    // Skip if student not in this class
    if (!studentMap[studentId]) return;
    
    studentMap[studentId].totalAttempts++;
    
    if (result.is_correct) {
      studentMap[studentId].correctAnswers++;
      // Add points based on activity type
      switch (result.activity_type) {
        case 'matching':
          studentMap[studentId].score += 5;
          break;
        case 'spelling':
          studentMap[studentId].score += 10;
          break;
        case 'bubble_pop':
          studentMap[studentId].score += 8;
          break;
        case 'picture_quiz':
          studentMap[studentId].score += 7;
          break;
        default:
          studentMap[studentId].score += 5;
      }
    }
  });
  
  // Convert to array and sort by score
  const sortedScores = Object.values(studentMap).sort((a, b) => b.score - a.score);
  
  // Add rank to each student
  sortedScores.forEach((student, index) => {
    student.rank = index + 1;
  });
  
  return sortedScores;
}

/**
 * Render the leaderboard in the UI
 * @param {Array} studentScores - Array of student score objects
 */
function renderLeaderboard(studentScores) {
  const leaderboardContainer = document.getElementById('leaderboard-container');
  leaderboardContainer.innerHTML = '';
  
  // Create leaderboard table
  const table = document.createElement('table');
  table.className = 'leaderboard-table';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Student</th>
      <th>Score</th>
      <th>Correct Answers</th>
      <th>Total Attempts</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  studentScores.forEach(student => {
    const row = document.createElement('tr');
    
    // Add top-rank class for top 3 students
    if (student.rank <= 3) {
      row.classList.add('top-rank');
    }
    
    // Add current-student class if this is the current student
    if (currentStudent && student.id === currentStudent.id) {
      row.classList.add('current-student');
    }
    
    // Calculate success rate
    const successRate = student.totalAttempts > 0 
      ? Math.round((student.correctAnswers / student.totalAttempts) * 100) 
      : 0;
    
    row.innerHTML = `
      <td class="rank">${student.rank}</td>
      <td class="student-name">${student.name}</td>
      <td class="score">${student.score}</td>
      <td>${student.correctAnswers} (${successRate}%)</td>
      <td>${student.totalAttempts}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  leaderboardContainer.appendChild(table);
}

/**
 * Handle home button navigation
 * @param {Event} event - The click event
 */
function handleHomeNavigation(event) {
  event.preventDefault();
  
  // Clean up any running activities
  cleanupActivities();
  
  // If user is logged in (dashboard is visible)
  if (currentStudent && currentClass) {
    // Hide leaderboard section if visible
    const leaderboardSection = document.getElementById('leaderboard-section');
    if (leaderboardSection) {
      leaderboardSection.classList.add('hidden');
    }
    
    // Show vocabulary lists section
    const vocabularyListsSection = document.getElementById('vocabulary-lists-section');
    if (vocabularyListsSection) {
      vocabularyListsSection.classList.remove('hidden');
    }
    
    // Reload vocabulary lists to ensure they're up to date
    loadVocabularyLists(currentClass.id);
  } else {
    // If not logged in, show student selection
    showSection('student-selection');
  }
}

// Make the functions available globally
window.trackActivityResult = trackActivityResult;
window.loadLeaderboard = loadLeaderboard;

/**
 * Launch the picture quiz for a vocabulary list
 * @param {Array} words - Array of vocabulary word objects
 * @param {string} listName - The name of the vocabulary list
 */
function launchPictureQuiz(words, listName) {
  console.log('Launching Picture Quiz with', words.length, 'words');
  
  // Clean up any existing activities
  cleanupActivities();
  
  // Filter words that have images
  const wordsWithImages = words.filter(word => word.image_url);
  
  // We need at least 4 words with images for a meaningful quiz
  if (wordsWithImages.length < 4) {
    showAlert('Not enough words with images for the picture quiz. Add more images to your vocabulary words.', 'error');
    return;
  }
  
  // Randomize the order
  const randomizedWords = [...wordsWithImages].sort(() => Math.random() - 0.5);
  
  // Remove existing activity section if it exists
  let activitySection = document.getElementById('vocabulary-activity-section');
  if (activitySection) {
    activitySection.remove();
  }
  
  // Create a new activity section
  activitySection = document.createElement('div');
  activitySection.id = 'vocabulary-activity-section';
  
  // Create activity HTML
  activitySection.innerHTML = `
    <div class="activity-header">
      <h2 class="activity-title">Picture Quiz: <span id="activity-list-name">${listName}</span></h2>
    </div>
    
    <p id="activity-instructions">Look at the picture and choose the correct word.</p>
    
    <div id="picture-quiz-container" class="picture-quiz-container">
      <div id="quiz-progress" class="activity-progress">Question 1 of ${randomizedWords.length}</div>
      
      <div id="quiz-image" class="quiz-image"></div>
      
      <div id="quiz-options" class="quiz-options"></div>
    </div>
    
    <div id="results-container" class="results-container hidden">
      <h2 class="results-title">Quiz Complete!</h2>
      <div id="quiz-score" class="activity-score"></div>
      <div class="results-buttons">
        <button id="try-again-btn" class="btn">Try Again</button>
        <button id="back-to-list-btn" class="btn btn-secondary">Back to List</button>
      </div>
    </div>
    
    <div id="feedback-message" class="feedback-message"></div>
  `;
  
  // Add to the dashboard
  document.getElementById('student-dashboard').appendChild(activitySection);
  
  // Hide lists section
  document.getElementById('vocabulary-lists-section').classList.add('hidden');
  
  // Show activity section
  activitySection.classList.remove('hidden');
  
  // Initialize the picture quiz
  initPictureQuiz(randomizedWords);
}

/**
 * Initialize the picture quiz
 * @param {Array} words - Array of vocabulary word objects
 */
function initPictureQuiz(words) {
  console.log('Initializing picture quiz with', words.length, 'words');
  
  // Quiz state variables
  let currentQuestionIndex = 0;
  let correctAnswers = 0;
  let totalQuestions = words.length;
  
  // Start the quiz
  showQuestion(currentQuestionIndex);
  
  // Add event listeners for quiz controls
  document.getElementById('try-again-btn').addEventListener('click', () => {
    // Reset and restart the quiz
    document.getElementById('results-container').classList.add('hidden');
    currentQuestionIndex = 0;
    correctAnswers = 0;
    showQuestion(currentQuestionIndex);
  });
  
  document.getElementById('back-to-list-btn').addEventListener('click', () => {
    // Go back to vocabulary lists
    document.getElementById('vocabulary-activity-section').classList.add('hidden');
    document.getElementById('vocabulary-lists-section').classList.remove('hidden');
    
    // Refresh the leaderboard
    if (currentClass) {
      loadLeaderboard(currentClass.id);
    }
  });
  
  /**
   * Show a question
   * @param {number} index - The index of the question to show
   */
  function showQuestion(index) {
    // Update progress
    document.getElementById('quiz-progress').textContent = `Question ${index + 1} of ${totalQuestions}`;
    
    // Get the current word
    const currentWord = words[index];
    
    // Display the image
    const quizImage = document.getElementById('quiz-image');
    quizImage.innerHTML = `
      <img src="${currentWord.image_url}" alt="Vocabulary image" onerror="this.src='../img/placeholder.png'">
      <button class="audio-button">
        <i class="fas fa-volume-up"></i>
      </button>
    `;
    
    // Add audio button functionality
    quizImage.querySelector('.audio-button').addEventListener('click', () => {
      speakWord(currentWord.word);
    });
    
    // Generate options (1 correct, 3 random)
    const options = generateOptions(currentWord, words);
    
    // Display options
    const quizOptions = document.getElementById('quiz-options');
    quizOptions.innerHTML = '';
    
    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'quiz-option';
      button.textContent = option.word;
      button.dataset.correct = option.isCorrect;
      
      button.addEventListener('click', () => handleOptionClick(button));
      
      quizOptions.appendChild(button);
    });
  }
  
  /**
   * Generate quiz options
   * @param {Object} correctWord - The correct word
   * @param {Array} allWords - All available words
   * @returns {Array} - Array of option objects
   */
  function generateOptions(correctWord, allWords) {
    // Create correct option
    const options = [
      {
        word: correctWord.word,
        isCorrect: true
      }
    ];
    
    // Create a pool of incorrect options (excluding the correct word)
    const incorrectPool = allWords.filter(word => word.id !== correctWord.id);
    
    // Shuffle the pool
    const shuffledPool = [...incorrectPool].sort(() => Math.random() - 0.5);
    
    // Add 3 incorrect options (or as many as available)
    const numIncorrectOptions = Math.min(3, shuffledPool.length);
    for (let i = 0; i < numIncorrectOptions; i++) {
      options.push({
        word: shuffledPool[i].word,
        isCorrect: false
      });
    }
    
    // Shuffle the options
    return options.sort(() => Math.random() - 0.5);
  }
  
  /**
   * Handle option click
   * @param {HTMLElement} option - The clicked option
   */
  function handleOptionClick(option) {
    // Get the current word
    const currentWord = words[currentQuestionIndex];
    
    // Disable all options
    const allOptions = document.querySelectorAll('.quiz-option');
    allOptions.forEach(opt => {
      opt.disabled = true;
      
      // Highlight correct/incorrect
      if (opt.dataset.correct === 'true') {
        opt.classList.add('correct');
      } else if (opt === option && opt.dataset.correct === 'false') {
        opt.classList.add('incorrect');
      }
    });
    
    // Show feedback
    const feedbackMessage = document.getElementById('feedback-message');
    
    if (option.dataset.correct === 'true') {
      // Correct answer
      feedbackMessage.textContent = 'Correct! 🎉';
      feedbackMessage.className = 'feedback-message success';
      correctAnswers++;
      
      // Track the correct result
      trackActivityResult(
        currentWord.id,
        'picture_quiz',
        true,
        1
      );
      
      // Play success sound
      playSound('success');
    } else {
      // Incorrect answer
      feedbackMessage.textContent = 'Incorrect! Try again next time.';
      feedbackMessage.className = 'feedback-message error';
      
      // Track the incorrect result
      trackActivityResult(
        currentWord.id,
        'picture_quiz',
        false,
        1
      );
      
      // Play error sound
      playSound('error');
    }
    
    // Show feedback for a moment
    setTimeout(() => {
      feedbackMessage.textContent = '';
      feedbackMessage.className = 'feedback-message';
      
      // Move to next question or end quiz
      currentQuestionIndex++;
      
      if (currentQuestionIndex < totalQuestions) {
        showQuestion(currentQuestionIndex);
      } else {
        quizComplete();
      }
    }, 1500);
  }
  
  /**
   * Play a sound effect
   * @param {string} type - The type of sound ('success' or 'error')
   */
  function playSound(type) {
    // Create audio element
    const audio = new Audio();
    
    if (type === 'success') {
      audio.src = '../sounds/success.mp3';
    } else {
      audio.src = '../sounds/error.mp3';
    }
    
    // Fallback if sound files don't exist
    audio.onerror = function() {
      console.log('Sound file not found');
    };
    
    // Play the sound
    audio.play().catch(e => {
      console.log('Could not play sound:', e);
    });
  }
  
  /**
   * Speak a word using the Web Speech API
   * @param {string} word - The word to speak
   */
  function speakWord(word) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.8; // Slightly slower for learning
      window.speechSynthesis.speak(utterance);
    } else {
      console.log('Text-to-speech not supported in this browser');
    }
  }
  
  /**
   * Handle quiz completion
   */
  function quizComplete() {
    console.log('Quiz complete!');
    
    // Calculate score
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Update score display
    document.getElementById('quiz-score').textContent = 
      `You got ${correctAnswers} out of ${totalQuestions} correct (${score}%)`;
    
    // Show results
    document.getElementById('results-container').classList.remove('hidden');
  }
} 