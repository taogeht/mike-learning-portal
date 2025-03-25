// Spelling Activities JavaScript
console.log('Spelling activities script loading...');

// Check if there's a pending initialization
if (window.pendingSpellingInit) {
  console.log('Found pending spelling initialization, processing now...');
  setTimeout(() => {
    if (window.pendingSpellingInit.words && window.pendingSpellingInit.level) {
      initSpellingActivity(window.pendingSpellingInit.words, window.pendingSpellingInit.level);
      window.pendingSpellingInit = null;
    }
  }, 0);
}

// Global variables
let currentWord = null;
let currentLevel = 1;
let currentWordIndex = 0;
let vocabularyWords = [];
let correctAnswers = 0;
let totalAttempts = 0;

/**
 * Initialize the spelling activity
 * @param {Array} words - Array of vocabulary word objects
 * @param {number} level - Difficulty level (1-3)
 */
function initSpellingActivity(words, level) {
  console.log('Initializing spelling activity with level:', level);
  
  if (!words || words.length === 0) {
    console.error('No words provided for spelling activity');
    showAlert('No vocabulary words available for this activity.', 'error');
    return;
  }
  
  // Check if the activity section exists
  const activitySection = document.getElementById('vocabulary-activity-section');
  if (!activitySection) {
    console.error('Could not find vocabulary-activity-section');
    showAlert('Error initializing spelling activity. Please refresh the page and try again.', 'error');
    return;
  }
  
  // Store words and level
  vocabularyWords = words;
  currentLevel = level;
  currentWordIndex = 0;
  correctAnswers = 0;
  totalAttempts = 0;
  
  // Update UI to show current level
  const activityLevelElement = document.getElementById('activity-level');
  if (activityLevelElement) {
    activityLevelElement.textContent = `Level ${level}`;
  }
  
  // Show appropriate instructions based on level
  const instructionsElement = document.getElementById('activity-instructions');
  if (instructionsElement) {
    switch(level) {
      case 1:
        instructionsElement.textContent = 'Tap the letters to spell the word shown.';
        break;
      case 2:
        instructionsElement.textContent = 'Look at the image and tap the letters to spell the word.';
        break;
      case 3:
        instructionsElement.textContent = 'Look at the image and type the word.';
        break;
    }
  }
  
  // Add event listener for level selection
  const levelSelectors = document.querySelectorAll('.level-selector');
  if (levelSelectors.length > 0) {
    // Remove any existing listeners first
    levelSelectors.forEach(button => {
      // Clone and replace to remove old listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });
    
    // Add new listeners
    document.querySelectorAll('.level-selector').forEach(button => {
      // Update active class
      if (parseInt(button.getAttribute('data-level')) === level) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
      
      // Add click listener
      button.addEventListener('click', () => {
        const newLevel = parseInt(button.getAttribute('data-level'));
        console.log('Level button clicked, changing to level:', newLevel);
        initSpellingActivity(vocabularyWords, newLevel);
      });
    });
  }
  
  // Load the first word
  if (vocabularyWords.length > 0) {
    try {
      loadWord(vocabularyWords[0]);
    } catch (error) {
      console.error('Error loading first word:', error);
      showAlert('Error initializing spelling activity. Please refresh the page and try again.', 'error');
    }
  } else {
    showAlert('No vocabulary words available for this activity.', 'error');
  }
}

/**
 * Load a word for the spelling activity
 * @param {Object} wordObj - The vocabulary word object
 */
function loadWord(wordObj) {
  currentWord = wordObj;
  
  // Update progress indicator
  const progressElement = document.getElementById('activity-progress');
  if (progressElement) {
    progressElement.textContent = `Word ${currentWordIndex + 1} of ${vocabularyWords.length}`;
  }
  
  // Get or create required elements
  let wordContainer = document.getElementById('word-display');
  let imageContainer = document.getElementById('word-image');
  let letterContainer = document.getElementById('letter-container');
  let inputContainer = document.getElementById('input-container');
  
  // Get the parent container
  const spellingActivityContainer = document.getElementById('spelling-activity-container');
  
  // If container is missing, try to find the activity section to add it
  if (!spellingActivityContainer) {
    const activitySection = document.getElementById('vocabulary-activity-section');
    if (!activitySection) {
      console.error('Could not find vocabulary-activity-section');
      return;
    }
    
    // Create the container if it doesn't exist
    const newContainer = document.createElement('div');
    newContainer.id = 'spelling-activity-container';
    newContainer.className = 'spelling-activity-container';
    activitySection.appendChild(newContainer);
    
    // Create all required elements
    newContainer.innerHTML = `
      <div id="activity-progress" class="activity-progress">Word ${currentWordIndex + 1} of ${vocabularyWords.length}</div>
      <div id="word-display" class="word-display"></div>
      <div id="word-image" class="word-image"></div>
      <div id="letter-container" class="letter-container"></div>
      <div id="input-container" class="input-container"></div>
    `;
    
    // Reassign elements
    wordContainer = document.getElementById('word-display');
    imageContainer = document.getElementById('word-image');
    letterContainer = document.getElementById('letter-container');
    inputContainer = document.getElementById('input-container');
  }
  
  // Check again if all required elements exist
  if (!wordContainer || !imageContainer || !letterContainer || !inputContainer) {
    console.error('Required elements for spelling activity not found in the DOM and could not be created');
    return;
  }
  
  // Clear previous content
  wordContainer.innerHTML = '';
  imageContainer.innerHTML = '';
  letterContainer.innerHTML = '';
  inputContainer.innerHTML = '';
  
  // Add image
  const img = document.createElement('img');
  img.src = wordObj.image_url || '../img/placeholder.png';
  img.alt = wordObj.word;
  img.onerror = function() { this.src = '../img/placeholder.png'; };
  imageContainer.appendChild(img);
  
  // Add audio button
  const audioButton = document.createElement('button');
  audioButton.className = 'audio-button';
  audioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
  audioButton.setAttribute('aria-label', 'Listen to the word');
  audioButton.addEventListener('click', () => {
    speakWord(wordObj.word);
  });
  imageContainer.appendChild(audioButton);
  
  // Different display based on level
  switch(currentLevel) {
    case 1:
      // Level 1: Show word, image, and scrambled letters
      const wordElement = document.createElement('div');
      wordElement.className = 'target-word';
      wordElement.textContent = wordObj.word;
      wordContainer.appendChild(wordElement);
      
      // Create letter buttons
      createLetterButtons(wordObj.word, letterContainer, inputContainer);
      break;
      
    case 2:
      // Level 2: Show image and scrambled letters, but no word
      // Create letter buttons
      createLetterButtons(wordObj.word, letterContainer, inputContainer);
      break;
      
    case 3:
      // Level 3: Show image, but no word or letters
      // Create text input
      const inputForm = document.createElement('form');
      inputForm.id = 'spelling-form';
      inputForm.innerHTML = `
        <input type="text" id="spelling-input" placeholder="Type the word" autocomplete="off">
        <button type="submit" class="btn">Check</button>
      `;
      inputContainer.appendChild(inputForm);
      
      // Add event listener for form submission
      inputForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = document.getElementById('spelling-input');
        checkAnswer(input.value.trim().toLowerCase(), wordObj.word.toLowerCase());
      });
      
      // Focus on input
      setTimeout(() => {
        document.getElementById('spelling-input').focus();
      }, 100);
      break;
  }
}

/**
 * Create letter buttons for levels 1 and 2
 * @param {string} word - The word to create buttons for
 * @param {HTMLElement} letterContainer - Container for letter buttons
 * @param {HTMLElement} inputContainer - Container for input display
 */
function createLetterButtons(word, letterContainer, inputContainer) {
  // Create input display
  const inputDisplay = document.createElement('div');
  inputDisplay.className = 'spelling-input-display';
  inputContainer.appendChild(inputDisplay);
  
  // Create check button
  const checkButton = document.createElement('button');
  checkButton.className = 'btn check-spelling-btn';
  checkButton.textContent = 'Check';
  checkButton.disabled = true;
  inputContainer.appendChild(checkButton);
  
  // Add event listener for check button
  checkButton.addEventListener('click', () => {
    const inputWord = Array.from(inputDisplay.children)
      .map(span => span.textContent)
      .join('');
    
    checkAnswer(inputWord.toLowerCase(), word.toLowerCase());
  });
  
  // Create letter buttons with scrambled letters
  const letters = word.split('');
  shuffleArray(letters);
  
  letters.forEach(letter => {
    const letterButton = document.createElement('button');
    letterButton.className = 'letter-button';
    letterButton.textContent = letter;
    letterContainer.appendChild(letterButton);
    
    // Add event listener
    letterButton.addEventListener('click', function() {
      if (this.classList.contains('used')) return;
      
      // Add letter to input display
      const letterSpan = document.createElement('span');
      letterSpan.className = 'input-letter';
      letterSpan.textContent = letter;
      letterSpan.setAttribute('data-button-id', letterButton.id);
      inputDisplay.appendChild(letterSpan);
      
      // Mark button as used
      this.classList.add('used');
      
      // Enable check button if all letters are used
      if (inputDisplay.children.length === word.length) {
        checkButton.disabled = false;
      }
      
      // Add event listener to remove letter when clicked
      letterSpan.addEventListener('click', function() {
        // Find the original button and mark it as unused
        const originalButton = document.querySelector(`.letter-button.used:nth-child(${Array.from(letterContainer.children).indexOf(letterButton) + 1})`);
        if (originalButton) {
          originalButton.classList.remove('used');
        }
        
        // Remove the letter from input display
        this.remove();
        
        // Disable check button if not all letters are used
        checkButton.disabled = true;
      });
    });
  });
}

/**
 * Check if the answer is correct
 * @param {string} answer - The user's answer
 * @param {string} correctWord - The correct word
 */
function checkAnswer(answer, correctWord) {
  totalAttempts++;
  
  if (answer === correctWord) {
    // Correct answer
    correctAnswers++;
    showFeedback(true);
    
    // Track the correct result
    if (typeof window.trackActivityResult === 'function' && currentWord) {
      window.trackActivityResult(
        currentWord.id,
        'spelling',
        true,
        1
      );
    }
    
    // Move to next word after a delay
    setTimeout(() => {
      currentWordIndex++;
      if (currentWordIndex < vocabularyWords.length) {
        loadWord(vocabularyWords[currentWordIndex]);
      } else {
        showResults();
      }
    }, 1500);
  } else {
    // Incorrect answer
    showFeedback(false);
    
    // Track the incorrect result
    if (typeof window.trackActivityResult === 'function' && currentWord) {
      window.trackActivityResult(
        currentWord.id,
        'spelling',
        false,
        1
      );
    }
    
    // For level 3, clear the input for another try
    if (currentLevel === 3) {
      const input = document.getElementById('spelling-input');
      if (input) {
        input.value = '';
      }
    } else {
      // For levels 1-2, reset the letter buttons
      resetLetterButtons();
    }
  }
}

/**
 * Show feedback for correct/incorrect answers
 * @param {boolean} isCorrect - Whether the answer is correct
 */
function showFeedback(isCorrect) {
  const feedbackElement = document.getElementById('feedback-message');
  
  if (isCorrect) {
    feedbackElement.textContent = 'Correct!';
    feedbackElement.className = 'feedback-message correct';
    
    // Speak the word again for reinforcement
    speakWord(currentWord.word);
  } else {
    feedbackElement.textContent = 'Try again!';
    feedbackElement.className = 'feedback-message incorrect';
  }
  
  // Show feedback
  feedbackElement.classList.add('show');
  
  // Hide feedback after a delay
  setTimeout(() => {
    feedbackElement.classList.remove('show');
  }, 1500);
}

/**
 * Show results at the end of the activity
 */
function showResults() {
  const activityContainer = document.getElementById('spelling-activity-container');
  const resultsContainer = document.getElementById('results-container');
  
  // Hide activity
  activityContainer.classList.add('hidden');
  
  // Show results
  resultsContainer.classList.remove('hidden');
  
  // Update results
  const scoreElement = document.getElementById('activity-score');
  const percentage = Math.round((correctAnswers / vocabularyWords.length) * 100);
  scoreElement.textContent = `${correctAnswers} / ${vocabularyWords.length} (${percentage}%)`;
  
  // Add event listener for try again button
  document.getElementById('try-again-btn').addEventListener('click', () => {
    // Reset and restart
    currentWordIndex = 0;
    correctAnswers = 0;
    totalAttempts = 0;
    
    // Randomize the words again for a different order
    vocabularyWords = [...vocabularyWords].sort(() => Math.random() - 0.5);
    
    // Hide results
    resultsContainer.classList.add('hidden');
    
    // Show activity
    activityContainer.classList.remove('hidden');
    
    // Load first word
    loadWord(vocabularyWords[0]);
  });
  
  // Add event listener for back to list button
  document.getElementById('back-to-list-btn').addEventListener('click', () => {
    // Hide activity section
    document.getElementById('vocabulary-activity-section').classList.add('hidden');
    
    // Show lists section
    document.getElementById('vocabulary-lists-section').classList.remove('hidden');
    
    // Refresh the leaderboard if the function exists
    if (typeof window.loadLeaderboard === 'function' && window.currentClass) {
      window.loadLeaderboard(window.currentClass.id);
    }
  });
}

/**
 * Use the Web Speech API to speak the word
 * @param {string} word - The word to speak
 */
function speakWord(word) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8; // Slightly slower rate for learning
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Text-to-speech not supported in this browser');
  }
}

/**
 * Reset letter buttons for levels 1-2 when an incorrect answer is given
 */
function resetLetterButtons() {
  // Get the input display and letter container
  const inputDisplay = document.querySelector('.spelling-input-display');
  const letterContainer = document.getElementById('letter-container');
  
  if (!inputDisplay || !letterContainer) return;
  
  // Clear the input display
  inputDisplay.innerHTML = '';
  
  // Reset all letter buttons
  const letterButtons = letterContainer.querySelectorAll('.letter-button');
  letterButtons.forEach(button => {
    button.classList.remove('used');
  });
  
  // Disable the check button
  const checkButton = document.querySelector('.check-spelling-btn');
  if (checkButton) {
    checkButton.disabled = true;
  }
}

/**
 * Shuffle array elements (Fisher-Yates algorithm)
 * @param {Array} array - The array to shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Show an alert message (backed by the student.js showAlert or fallback)
 * @param {string} message - The message to display
 * @param {string} type - The type of alert ('success', 'error', 'info')
 */
function showAlert(message, type = 'info') {
  // Try to use the student.js showAlert if available
  if (typeof window.showAlert === 'function') {
    window.showAlert(message, type);
    return;
  }
  
  // Fallback implementation
  console.log(`Alert (${type}): ${message}`);
  
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) {
    // If no alert container exists, create one
    const newContainer = document.createElement('div');
    newContainer.id = 'alert-container';
    document.body.insertBefore(newContainer, document.body.firstChild);
  }
  
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

// Expose functions to the global scope
window.SpellingActivities = {
  initSpellingActivity,
  loadWord,
  checkAnswer,
  showFeedback,
  showResults,
  speakWord,
  resetLetterButtons,
  showAlert
};

console.log('Spelling activities initialized, SpellingActivities object:', window.SpellingActivities); 