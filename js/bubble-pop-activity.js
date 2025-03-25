/**
 * Bubble Pop Spelling Activity
 * A fun activity where students pop bubbles with letters to spell vocabulary words
 */

// Create a namespace for Bubble Pop to avoid variable conflicts
window.BubblePopActivity = (function() {
  // Private variables
  let currentWord = null;
  let currentWordIndex = 0;
  let vocabularyWords = [];
  let correctAnswers = 0;
  let totalAttempts = 0;
  let selectedLetters = [];
  let bubbleLetters = [];
  let animationFrameId = null;

  /**
   * Show an alert message (using the global showAlert function from student.js)
   * @param {string} message - The message to display
   * @param {string} type - The type of alert ('success', 'error', 'info')
   */
  function showAlert(message, type = 'info') {
    // Use the global showAlert function if available, otherwise log to console
    if (typeof window.showAlert === 'function') {
      window.showAlert(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Initialize the bubble pop activity
   * @param {Array} words - Array of vocabulary word objects
   */
  function initBubblePopActivity(words) {
    console.log('Initializing bubble pop activity');
    
    // Store words
    vocabularyWords = words;
    currentWordIndex = 0;
    correctAnswers = 0;
    totalAttempts = 0;
    
    // Add event listeners for the results buttons
    document.getElementById('try-again-btn')?.addEventListener('click', () => {
      resetActivity();
    });
    
    document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
      // Hide activity section
      document.getElementById('vocabulary-activity-section').classList.add('hidden');
      
      // Show lists section
      document.getElementById('vocabulary-lists-section').classList.remove('hidden');
      
      // Refresh the leaderboard if the function exists
      if (typeof window.loadLeaderboard === 'function' && window.currentClass) {
        window.loadLeaderboard(window.currentClass.id);
      }
      
      // Cancel any ongoing animations
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });
    
    // Load the first word
    if (vocabularyWords.length > 0) {
      loadWord(vocabularyWords[0]);
    } else {
      showAlert('No vocabulary words available for this activity.', 'error');
    }
  }

  /**
   * Load a word for the bubble pop activity
   * @param {Object} wordObj - The vocabulary word object
   */
  function loadWord(wordObj) {
    // Store current word
    currentWord = wordObj;
    
    // Update progress
    document.getElementById('activity-progress').textContent = `Word ${currentWordIndex + 1} of ${vocabularyWords.length}`;
    
    // Display word or image based on difficulty
    const wordDisplay = document.getElementById('word-display');
    wordDisplay.textContent = wordObj.word;
    
    // Display image if available
    const wordImage = document.getElementById('word-image');
    if (wordObj.image_url) {
      wordImage.innerHTML = `<img src="${wordObj.image_url}" alt="${wordObj.word}" onerror="this.src='../img/placeholder.png'">`;
      wordImage.classList.remove('hidden');
    } else {
      wordImage.innerHTML = '';
      wordImage.classList.add('hidden');
    }
    
    // Reset selected letters
    selectedLetters = [];
    
    // Create word progress display (empty slots for each letter)
    const wordProgress = document.getElementById('word-progress');
    wordProgress.innerHTML = '';
    
    for (let i = 0; i < wordObj.word.length; i++) {
      const letterSlot = document.createElement('div');
      letterSlot.className = 'letter-slot';
      letterSlot.dataset.index = i;
      wordProgress.appendChild(letterSlot);
    }
    
    // Create bubbles with letters
    createBubbles(wordObj.word);
  }

  /**
   * Create bubbles with letters for the current word
   * @param {string} word - The current vocabulary word
   */
  function createBubbles(word) {
    const bubbleContainer = document.getElementById('bubble-container');
    bubbleContainer.innerHTML = '';
    
    // Get all letters from the word
    const wordLetters = word.toLowerCase().split('');
    
    // Add some distractor letters (about 10 extra letters)
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const distractorCount = Math.min(20 - wordLetters.length, 15); // Maximum 20 bubbles total
    
    let allLetters = [...wordLetters];
    
    for (let i = 0; i < distractorCount; i++) {
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      allLetters.push(randomLetter);
    }
    
    // Shuffle all letters
    allLetters = allLetters.sort(() => Math.random() - 0.5);
    
    // Create bubble for each letter
    bubbleLetters = [];
    
    allLetters.forEach((letter, index) => {
      const bubble = document.createElement('div');
      bubble.className = 'letter-bubble';
      bubble.textContent = letter;
      bubble.dataset.letter = letter;
      
      // Random position within container
      const bubbleSize = 60; // Size in pixels
      const containerWidth = bubbleContainer.clientWidth - bubbleSize;
      const containerHeight = bubbleContainer.clientHeight - bubbleSize;
      
      // Random starting position
      const x = Math.random() * containerWidth;
      const y = Math.random() * containerHeight;
      
      // Random velocity
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = (Math.random() - 0.5) * 1.5;
      
      bubbleLetters.push({
        element: bubble,
        x,
        y,
        vx,
        vy,
        popped: false
      });
      
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      
      // Add click event to pop the bubble
      bubble.addEventListener('click', () => {
        if (!bubble.classList.contains('popped')) {
          popBubble(bubble, letter);
        }
      });
      
      bubbleContainer.appendChild(bubble);
    });
    
    // Start bubble animation
    animateBubbles();
  }

  /**
   * Animate the bubbles floating around
   */
  function animateBubbles() {
    const bubbleContainer = document.getElementById('bubble-container');
    const containerWidth = bubbleContainer.clientWidth;
    const containerHeight = bubbleContainer.clientHeight;
    const bubbleSize = 60; // Size in pixels
    
    // Move each bubble
    bubbleLetters.forEach(bubble => {
      if (bubble.popped) return;
      
      // Update position
      bubble.x += bubble.vx;
      bubble.y += bubble.vy;
      
      // Bounce off walls
      if (bubble.x <= 0 || bubble.x >= containerWidth - bubbleSize) {
        bubble.vx *= -1;
        bubble.x = Math.max(0, Math.min(bubble.x, containerWidth - bubbleSize));
      }
      
      if (bubble.y <= 0 || bubble.y >= containerHeight - bubbleSize) {
        bubble.vy *= -1;
        bubble.y = Math.max(0, Math.min(bubble.y, containerHeight - bubbleSize));
      }
      
      // Update element position
      bubble.element.style.left = `${bubble.x}px`;
      bubble.element.style.top = `${bubble.y}px`;
    });
    
    // Continue animation
    animationFrameId = requestAnimationFrame(animateBubbles);
  }

  /**
   * Pop a bubble and process the letter
   * @param {HTMLElement} bubble - The bubble element
   * @param {string} letter - The letter in the bubble
   */
  function popBubble(bubble, letter) {
    // Mark as popped
    bubble.classList.add('popped');
    
    // Find the bubble in our array and mark it as popped
    const bubbleObj = bubbleLetters.find(b => b.element === bubble);
    if (bubbleObj) {
      bubbleObj.popped = true;
    }
    
    // Play pop sound
    playSound('pop');
    
    // Add letter to selected letters
    selectedLetters.push(letter);
    
    // Update the word progress display
    updateWordProgress();
    
    // Check if word is complete
    checkWordCompletion();
  }

  /**
   * Update the word progress display with selected letters
   */
  function updateWordProgress() {
    const wordProgress = document.getElementById('word-progress');
    const slots = wordProgress.querySelectorAll('.letter-slot');
    
    // Fill in slots with selected letters
    for (let i = 0; i < Math.min(selectedLetters.length, slots.length); i++) {
      slots[i].textContent = selectedLetters[i];
      slots[i].classList.add('filled');
    }
  }

  /**
   * Check if the word is complete and correct
   */
  function checkWordCompletion() {
    const word = currentWord.word.toLowerCase();
    const selectedWord = selectedLetters.join('');
    
    // Check if we've selected enough letters
    if (selectedLetters.length >= word.length) {
      totalAttempts++;
      
      // Check if the word is correct
      if (selectedWord === word) {
        // Word is correct
        correctAnswers++;
        showFeedback('Correct! 🎉', 'success');
        playSound('correct');
        
        // Track the correct result
        if (typeof window.trackActivityResult === 'function') {
          window.trackActivityResult(
            currentWord.id,
            'bubble_pop',
            true,
            1
          );
        }
        
        // Move to next word after a delay
        setTimeout(() => {
          moveToNextWord();
        }, 1500);
      } else {
        // Word is incorrect
        showFeedback('Try again! 🔄', 'error');
        playSound('incorrect');
        
        // Track the incorrect result
        if (typeof window.trackActivityResult === 'function') {
          window.trackActivityResult(
            currentWord.id,
            'bubble_pop',
            false,
            1
          );
        }
        
        // Reset selected letters after a delay
        setTimeout(() => {
          selectedLetters = [];
          
          // Clear word progress
          const wordProgress = document.getElementById('word-progress');
          const slots = wordProgress.querySelectorAll('.letter-slot');
          slots.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled');
          });
          
          // Reset bubbles
          createBubbles(currentWord.word);
        }, 1500);
      }
    }
  }

  /**
   * Move to the next word in the list
   */
  function moveToNextWord() {
    currentWordIndex++;
    
    // Check if we've completed all words
    if (currentWordIndex >= vocabularyWords.length) {
      // Activity complete
      showResults();
    } else {
      // Load next word
      loadWord(vocabularyWords[currentWordIndex]);
    }
  }

  /**
   * Show feedback message
   * @param {string} message - The feedback message
   * @param {string} type - The type of feedback (success, error)
   */
  function showFeedback(message, type) {
    const feedbackElement = document.getElementById('feedback-message');
    feedbackElement.textContent = message;
    feedbackElement.className = `feedback-message ${type}`;
    
    // Show feedback
    feedbackElement.style.opacity = '1';
    
    // Hide feedback after a delay
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
    }, 1500);
  }

  /**
   * Show the results of the activity
   */
  function showResults() {
    // Cancel animation
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Hide activity container
    document.getElementById('bubble-pop-container').classList.add('hidden');
    
    // Show results container
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.classList.remove('hidden');
    
    // Update score
    const percentage = Math.round((correctAnswers / totalAttempts) * 100);
    document.getElementById('activity-score').textContent = `${correctAnswers}/${vocabularyWords.length} (${percentage}%)`;
    
    // Play sound based on score
    if (percentage >= 80) {
      playSound('victory');
    } else {
      playSound('complete');
    }
  }

  /**
   * Reset the activity to start again
   */
  function resetActivity() {
    // Reset variables
    currentWordIndex = 0;
    correctAnswers = 0;
    totalAttempts = 0;
    
    // Hide results container
    document.getElementById('results-container').classList.add('hidden');
    
    // Show activity container
    document.getElementById('bubble-pop-container').classList.remove('hidden');
    
    // Load the first word
    if (vocabularyWords.length > 0) {
      loadWord(vocabularyWords[0]);
    }
  }

  /**
   * Play a sound effect
   * @param {string} sound - The sound to play (pop, correct, incorrect, victory, complete)
   */
  function playSound(sound) {
    try {
      // Create audio element
      const audio = new Audio();
      
      // Set source based on sound type
      switch (sound) {
        case 'pop':
          audio.src = '../sounds/pop.mp3';
          break;
        case 'correct':
          audio.src = '../sounds/correct.mp3';
          break;
        case 'incorrect':
          audio.src = '../sounds/incorrect.mp3';
          break;
        case 'victory':
          audio.src = '../sounds/victory.mp3';
          break;
        case 'complete':
          audio.src = '../sounds/complete.mp3';
          break;
      }
      
      // Add error handler
      audio.onerror = function() {
        console.warn(`Sound file ${audio.src} not found or could not be played`);
      };
      
      // Play sound
      audio.play().catch(error => {
        console.warn('Could not play sound:', error);
      });
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  // Return public methods
  return {
    initBubblePopActivity: initBubblePopActivity,
    cleanup: function() {
      // Cancel any ongoing animations
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // Clear the bubbles array
      bubbleLetters = [];
      
      console.log('Bubble Pop Activity cleaned up');
    }
  };
})(); 