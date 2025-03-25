// Teacher Portal JavaScript
console.log('Teacher.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Teacher portal: DOMContentLoaded fired');
  
  try {
    // Check if user is authenticated
    const isAuthenticated = await Auth.requireAuth();
    if (!isAuthenticated) {
      console.log('Teacher portal: Authentication required');
      return;
    }

    // Get teacher profile
    const { profile, error: profileError } = await Auth.getUserProfile();
    if (profileError) {
      console.error('Error loading teacher profile:', profileError);
      alert('Error loading teacher profile. Please try again.');
      return;
    }

    if (!profile) {
      console.error('No teacher profile found');
      alert('No teacher profile found. Please contact support.');
      return;
    }

    console.log('Teacher portal: Profile loaded successfully');
    window.teacherProfile = profile;

    // Initialize the teacher portal
    await initTeacherPortal();
  } catch (error) {
    console.error('Error initializing teacher portal:', error);
    alert('Error initializing teacher portal: ' + error.message);
  }
});

// Global variables
let currentTeacher = null;
let currentClassId = null;
let currentVocabularyListId = null;

/**
 * Initialize the teacher portal
 */
async function initTeacherPortal() {
  try {
    console.log('Initializing teacher portal');
    
    // Get session directly from Supabase instead of using Auth
    const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
    console.log('Session data:', sessionData);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      showAlert('Error checking authentication: ' + sessionError.message, 'error');
      return;
    }
    
    // Check if session exists
    if (!sessionData || !sessionData.session) {
      console.log('No active session, redirecting to login');
      window.location.href = '../index.html?auth=required';
      return;
    }
    
    const userId = sessionData.session.user.id;
    console.log('User authenticated, ID:', userId);
    
    // Get teacher profile directly from Supabase
    const { data: teacherData, error: teacherError } = await window.supabaseClient
      .from('teachers')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('Teacher profile data:', teacherData);
    
    if (teacherError) {
      console.error('Error fetching teacher profile:', teacherError);
      showAlert('Error loading teacher profile: ' + teacherError.message, 'error');
      return;
    }
    
    if (!teacherData) {
      console.error('No teacher profile found for this user');
      showAlert('Your account is not linked to a teacher profile. Please contact an administrator.', 'error');
      return;
    }
    
    // Store teacher data
    currentTeacher = teacherData;
    console.log('Teacher profile loaded successfully:', currentTeacher);
    
    // Initialize UI components
    initUI();
    
    // Load dashboard data
    loadDashboardData();
  } catch (error) {
    console.error('Error initializing teacher portal:', error);
    showAlert('Error initializing teacher portal: ' + error.message, 'error');
  }
}

/**
 * Initialize UI components and event listeners
 */
function initUI() {
  // Add null checks for all DOM elements
  
  // Add Class button
  document.getElementById('add-class-btn')?.addEventListener('click', () => {
    openModal('add-class-modal');
  });
  
  // Add Student button
  document.getElementById('add-student-btn')?.addEventListener('click', () => {
    openModal('add-student-modal');
  });
  
  // Import Students button
  document.getElementById('import-students-btn')?.addEventListener('click', () => {
    openModal('import-students-modal');
  });
  
  // Add Vocabulary List button
  document.getElementById('add-vocabulary-list-btn')?.addEventListener('click', () => {
    openModal('add-vocabulary-list-modal');
  });
  
  // Add Vocabulary Word button
  document.getElementById('add-vocabulary-word-btn')?.addEventListener('click', () => {
    openModal('add-vocabulary-word-modal');
  });
  
  // View All Classes button
  document.getElementById('view-all-classes')?.addEventListener('click', loadClasses);
  
  // View All Students button
  document.getElementById('view-all-students')?.addEventListener('click', viewAllStudents);
  
  // View All Vocabulary button
  document.getElementById('view-all-vocabulary')?.addEventListener('click', viewAllVocabulary);
  
  // Export Results button
  document.getElementById('export-results-btn')?.addEventListener('click', exportStudentResults);
  
  // Apply Filters button
  document.getElementById('apply-filters-btn')?.addEventListener('click', applyResultsFilters);
  
  // Close buttons for modals
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Handle form submissions
  document.getElementById('add-class-form')?.addEventListener('submit', handleAddClass);
  document.getElementById('add-student-form')?.addEventListener('submit', handleAddStudent);
  document.getElementById('add-vocabulary-list-form')?.addEventListener('submit', handleAddVocabularyList);
  document.getElementById('add-vocabulary-word-form')?.addEventListener('submit', handleAddVocabularyWord);
  
  // Handle file uploads
  document.getElementById('students-csv-upload')?.addEventListener('change', handleStudentCSVUpload);
  
  // Handle image upload and preview
  document.getElementById('vocabulary-image-upload')?.addEventListener('change', handleImagePreview);
  document.getElementById('remove-image-btn')?.addEventListener('click', removeImagePreview);
  
  // Setup drag and drop for file uploads
  setupDragAndDrop('students-upload-container', 'students-csv-upload', handleStudentCSVUpload);
  
  // Load initial data
  loadDashboardData();
  loadClasses();
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    console.log('Logging out');
    const { error } = await window.supabaseClient.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
    
    console.log('Logout successful, redirecting to home');
    window.location.href = '../index.html';
  } catch (error) {
    console.error('Error signing out:', error);
    showAlert('Error signing out: ' + error.message, 'error');
  }
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

/**
 * Open a modal
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // Reset forms if present
  if (modalId === 'add-vocabulary-word-modal') {
    resetVocabularyWordForm();
  }
  
  modal.style.display = 'block';
}

/**
 * Reset the vocabulary word form
 */
function resetVocabularyWordForm() {
  const form = document.getElementById('add-vocabulary-word-form');
  if (form) {
    form.reset();
    removeImagePreview();
  }
}

/**
 * Show a specific section and hide others
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(sectionId) {
  // Hide all sections
  const sections = [
    'classes-section',
    'class-detail-section',
    'vocabulary-list-detail-section'
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
 * Activate a tab
 * @param {string} tabName - The name of the tab to activate
 */
function activateTab(tabName) {
  // Update tab buttons
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    if (content.id === `${tabName}-tab`) {
      content.classList.add('active');
      
      // Load tab-specific content if needed
      if (tabName === 'students' && currentClassId) {
        loadStudents(currentClassId);
      } else if (tabName === 'vocabulary' && currentClassId) {
        loadVocabularyLists(currentClassId);
      } else if (tabName === 'results' && currentClassId) {
        loadStudentResults(currentClassId);
      } else if (tabName === 'qrcode' && window.currentClassSlug) {
        generateQRCode(window.currentClassSlug);
      }
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
  try {
    // Get counts from database
    const [classesCount, studentsCount, vocabularyCount] = await Promise.all([
      getClassesCount(),
      getStudentsCount(),
      getVocabularyCount()
    ]);
    
    // Update UI
    document.getElementById('total-classes').textContent = classesCount;
    document.getElementById('total-students').textContent = studentsCount;
    document.getElementById('total-vocabulary').textContent = vocabularyCount;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showAlert('Error loading dashboard data', 'error');
  }
}

/**
 * Get the count of classes for the current teacher
 * @returns {Promise<number>} - The count of classes
 */
async function getClassesCount() {
  try {
    const { count, error } = await window.supabaseClient
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', currentTeacher.id);
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting classes count:', error);
    return 0;
  }
}

/**
 * Get the count of students for the current teacher
 * @returns {Promise<number>} - The count of students
 */
async function getStudentsCount() {
  try {
    const { data, error } = await window.supabaseClient
      .from('classes')
      .select('id')
      .eq('teacher_id', currentTeacher.id);
    
    if (error) throw error;
    
    if (data.length === 0) return 0;
    
    const classIds = data.map(c => c.id);
    
    const { count, error: countError } = await window.supabaseClient
      .from('class_students')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds);
    
    if (countError) throw countError;
    return count || 0;
  } catch (error) {
    console.error('Error getting students count:', error);
    return 0;
  }
}

/**
 * Get the count of vocabulary words for the current teacher
 * @returns {Promise<number>} - The count of vocabulary words
 */
async function getVocabularyCount() {
  try {
    // First get all classes for this teacher
    const { data: classes, error: classesError } = await window.supabaseClient
      .from('classes')
      .select('id')
      .eq('teacher_id', currentTeacher.id);
    
    if (classesError) throw classesError;
    
    if (classes.length === 0) return 0;
    
    const classIds = classes.map(c => c.id);
    
    // Get all vocabulary lists for these classes
    const { data: lists, error: listsError } = await window.supabaseClient
      .from('vocabulary_lists')
      .select('id')
      .in('class_id', classIds);
    
    if (listsError) throw listsError;
    
    if (lists.length === 0) return 0;
    
    const listIds = lists.map(l => l.id);
    
    // Count vocabulary words
    const { count, error: countError } = await window.supabaseClient
      .from('vocabulary_words')
      .select('*', { count: 'exact', head: true })
      .in('list_id', listIds);
    
    if (countError) throw countError;
    return count || 0;
  } catch (error) {
    console.error('Error getting vocabulary count:', error);
    return 0;
  }
}

/**
 * Load classes for the current teacher
 */
async function loadClasses() {
  try {
    const { data, error } = await window.supabaseClient
      .from('classes')
      .select('*')
      .eq('teacher_id', currentTeacher.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    renderClasses(data);
  } catch (error) {
    console.error('Error loading classes:', error);
    showAlert('Error loading classes', 'error');
  }
}

/**
 * Render classes in the UI
 * @param {Array} classes - Array of class objects
 */
function renderClasses(classes) {
  const classesSection = document.getElementById('classes-section');
  if (!classesSection || classesSection.classList.contains('hidden')) {
    // We're not in the classes section, no need to render
    return;
  }

  const classList = document.getElementById('class-list');
  const noClassesMessage = document.getElementById('no-classes-message');
  
  // Check if elements exist
  if (!classList) {
    console.error('Element with ID "class-list" not found');
    return;
  }
  
  // Clear existing content
  classList.innerHTML = '';
  
  if (classes.length === 0) {
    if (noClassesMessage) {
      noClassesMessage.classList.remove('hidden');
    }
    return;
  }
  
  if (noClassesMessage) {
    noClassesMessage.classList.add('hidden');
  }
  
  // Create class cards
  classes.forEach(classItem => {
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    classCard.innerHTML = `
      <div class="class-card-header">
        <h3>${classItem.name}</h3>
      </div>
      <div class="class-card-body">
        <p>${classItem.description || 'No description'}</p>
      </div>
      <div class="class-card-footer">
        <button class="btn view-class-btn" data-class-id="${classItem.id}">View Class</button>
        <button class="btn btn-danger delete-class-btn" data-class-id="${classItem.id}">Delete</button>
      </div>
    `;
    
    classList.appendChild(classCard);
    
    // Add event listeners
    classCard.querySelector('.view-class-btn').addEventListener('click', () => {
      viewClass(classItem.id);
    });
    
    classCard.querySelector('.delete-class-btn').addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete the class "${classItem.name}"? This action cannot be undone.`)) {
        deleteClass(classItem.id);
      }
    });
  });
}

/**
 * Handle adding a new class
 * @param {Event} event - The form submit event
 */
async function handleAddClass(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('class-name');
  const descriptionInput = document.getElementById('class-description');
  
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  
  if (!name) {
    showAlert('Please enter a class name', 'error');
    return;
  }
  
  try {
    // Generate a slug from the name
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Try to create the class
    let { data, error } = await window.supabaseClient
      .from('classes')
      .insert([
        {
          name,
          description,
          slug,
          teacher_id: currentTeacher.id
        }
      ])
      .select();
    
    // If there's a duplicate slug error, add a timestamp to make it unique
    if (error && error.code === '23505' && error.message.includes('classes_slug_key')) {
      console.log('Duplicate slug detected, adding timestamp to make it unique');
      
      // Add timestamp to make slug unique
      const timestamp = new Date().getTime();
      slug = `${slug}-${timestamp}`;
      
      // Try again with the unique slug
      const result = await window.supabaseClient
        .from('classes')
        .insert([
          {
            name,
            description,
            slug,
            teacher_id: currentTeacher.id
          }
        ])
        .select();
      
      data = result.data;
      error = result.error;
    }
    
    if (error) throw error;
    
    // Close modal
    document.getElementById('add-class-modal').style.display = 'none';
    
    // Reload classes
    loadClasses();
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Class created successfully', 'success');
  } catch (error) {
    console.error('Error creating class:', error);
    showAlert('Error creating class: ' + error.message, 'error');
  }
}

/**
 * View a class
 * @param {string} classId - The ID of the class to view
 */
async function viewClass(classId) {
  try {
    console.log('Viewing class:', classId);
    
    // Store current class ID
    currentClassId = classId;
    
    // Get class details
    const { data, error } = await window.supabaseClient
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();
    
    if (error) throw error;
    
    // Update UI
    document.getElementById('class-detail-title').textContent = data.name;
    
    // Store class slug for QR code
    window.currentClassSlug = data.slug;
    
    // Show class detail section
    showSection('class-detail-section');
    
    // Activate students tab by default
    activateTab('students');
    
    // Add tab click event listeners
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activateTab(tab.dataset.tab);
      });
    });
    
    // Add back button event listener
    document.getElementById('back-to-classes-btn').addEventListener('click', () => {
      showSection('classes-section');
    });
    
    // Add edit button event listener
    document.getElementById('edit-class-btn').addEventListener('click', handleEditClass);
    
    // Add download QR code button event listener
    document.getElementById('download-qrcode-btn').addEventListener('click', downloadQRCode);
  } catch (error) {
    console.error('Error viewing class:', error);
    showAlert('Error loading class details: ' + error.message, 'error');
  }
}

/**
 * Handle editing a class
 */
async function handleEditClass() {
  try {
    // Get current class details
    const { data, error } = await window.supabaseClient
      .from('classes')
      .select('*')
      .eq('id', currentClassId)
      .single();
    
    if (error) throw error;
    
    // Create a modal for editing
    const modalHTML = `
      <div id="edit-class-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Edit Class</h2>
          <form id="edit-class-form">
            <div class="form-group">
              <label for="edit-class-name">Class Name</label>
              <input type="text" id="edit-class-name" name="edit-class-name" value="${data.name}" required>
            </div>
            <div class="form-group">
              <label for="edit-class-description">Description</label>
              <textarea id="edit-class-description" name="edit-class-description" rows="3">${data.description || ''}</textarea>
            </div>
            <div class="form-group">
              <button type="submit" class="btn">Update Class</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('edit-class-modal');
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
      modal.remove();
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    document.getElementById('edit-class-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const name = document.getElementById('edit-class-name').value.trim();
      const description = document.getElementById('edit-class-description').value.trim();
      
      if (!name) {
        showAlert('Please enter a class name', 'error');
        return;
      }
      
      try {
        const { error } = await window.supabaseClient
          .from('classes')
          .update({ name, description })
          .eq('id', currentClassId);
        
        if (error) throw error;
        
        // Remove modal
        modal.remove();
        
        // Update UI
        document.getElementById('class-detail-title').textContent = name;
        
        // Reload classes
        loadClasses();
        
        showAlert('Class updated successfully', 'success');
      } catch (error) {
        console.error('Error updating class:', error);
        showAlert('Error updating class: ' + error.message, 'error');
      }
    });
  } catch (error) {
    console.error('Error editing class:', error);
    showAlert('Error editing class', 'error');
  }
}

/**
 * Delete a class
 * @param {string} classId - The ID of the class to delete
 */
async function deleteClass(classId) {
  try {
    const { error } = await window.supabaseClient
      .from('classes')
      .delete()
      .eq('id', classId);
    
    if (error) throw error;
    
    // Reload classes
    loadClasses();
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Class deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting class:', error);
    showAlert('Error deleting class: ' + error.message, 'error');
  }
}

/**
 * Load students for a class
 * @param {string} classId - The ID of the class
 */
async function loadStudents(classId) {
  try {
    // Get students for this class
    const { data, error } = await window.supabaseClient
      .from('class_students')
      .select(`
        id,
        students (
          id,
          name,
          email
        )
      `)
      .eq('class_id', classId);
    
    if (error) throw error;
    
    // Extract student data
    const students = data.map(item => ({
      id: item.students.id,
      name: item.students.name,
      email: item.students.email,
      class_student_id: item.id
    }));
    
    renderStudents(students);
  } catch (error) {
    console.error('Error loading students:', error);
    showAlert('Error loading students', 'error');
  }
}

/**
 * Render students in the UI
 * @param {Array} students - Array of student objects
 */
function renderStudents(students) {
  const studentsList = document.getElementById('students-list');
  const noStudentsMessage = document.getElementById('no-students-message');
  
  // Check if elements exist
  if (!studentsList) {
    console.error('Element with ID "students-list" not found');
    return;
  }
  
  if (!noStudentsMessage) {
    console.error('Element with ID "no-students-message" not found');
    // Continue anyway, as we can still render the students
  }
  
  // Clear existing content
  studentsList.innerHTML = '';
  
  if (students.length === 0) {
    if (noStudentsMessage) {
      noStudentsMessage.classList.remove('hidden');
    }
    return;
  }
  
  if (noStudentsMessage) {
    noStudentsMessage.classList.add('hidden');
  }
  
  // Create student rows
  students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student.name}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-student-btn" data-id="${student.class_student_id}">Remove</button>
      </td>
    `;
    
    studentsList.appendChild(row);
    
    // Add event listener for delete button
    row.querySelector('.delete-student-btn').addEventListener('click', () => {
      if (confirm(`Are you sure you want to remove ${student.name} from this class?`)) {
        removeStudentFromClass(student.class_student_id);
      }
    });
  });
}

/**
 * Handle adding a student
 * @param {Event} event - The form submit event
 */
async function handleAddStudent(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('student-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert('Please enter a student name', 'error');
    return;
  }
  
  try {
    // Create a UUID-based unique identifier for the student
    const uniqueId = `${name.replace(/\s+/g, '.').toLowerCase()}_${Date.now()}`;
    const email = `${uniqueId}@example.com`;
    
    // Create new student
    const { data: newStudent, error: createError } = await window.supabaseClient
      .from('students')
      .insert([{ name, email }])
      .select();
    
    if (createError) throw createError;
    
    const studentId = newStudent[0].id;
    
    // Add student to class
    const { error: addError } = await window.supabaseClient
      .from('class_students')
      .insert([{
        class_id: currentClassId,
        student_id: studentId
      }]);
    
    if (addError) throw addError;
    
    // Close modal
    document.getElementById('add-student-modal').style.display = 'none';
    
    // Clear form field
    nameInput.value = '';
    
    // Reload students
    loadStudents(currentClassId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Student added successfully', 'success');
  } catch (error) {
    console.error('Error adding student:', error);
    showAlert('Error adding student: ' + error.message, 'error');
  }
}

/**
 * Remove a student from a class
 * @param {string} classStudentId - The ID of the class_student junction record
 */
async function removeStudentFromClass(classStudentId) {
  try {
    const { error } = await window.supabaseClient
      .from('class_students')
      .delete()
      .eq('id', classStudentId);
    
    if (error) throw error;
    
    // Reload students
    loadStudents(currentClassId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Student removed from class', 'success');
  } catch (error) {
    console.error('Error removing student:', error);
    showAlert('Error removing student: ' + error.message, 'error');
  }
}

/**
 * Handle student CSV upload
 * @param {Event} event - The file input change event
 */
function handleStudentCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file type
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    showAlert('Please upload a CSV file', 'error');
    return;
  }
  
  // Enable import button
  document.getElementById('import-students-submit-btn').disabled = false;
}

/**
 * Handle importing students from CSV
 */
async function handleImportStudents() {
  const fileInput = document.getElementById('students-csv-upload');
  const file = fileInput.files[0];
  
  if (!file) {
    showAlert('Please select a CSV file', 'error');
    return;
  }
  
  try {
    // Parse CSV
    Papa.parse(file, {
      header: true,
      quoteChar: '"',        // Use double quotes to enclose fields
      escapeChar: '"',       // Use double quotes to escape quotes within fields
      skipEmptyLines: true,  // Skip empty lines
      complete: async (results) => {
        try {
          const students = results.data;
          
          // Validate data - just need a name
          const validStudents = students.filter(student => 
            student.name && student.name.trim()
          );
          
          if (validStudents.length === 0) {
            showAlert('No valid student data found in CSV', 'error');
            return;
          }
          
          // Process each student
          let addedCount = 0;
          
          for (const student of validStudents) {
            const name = student.name.trim();
            // Create a UUID-based unique identifier for the student
            const uniqueId = `${name.replace(/\s+/g, '.').toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const email = `${uniqueId}@example.com`;
            
            // Create new student
            const { data: newStudent, error: createError } = await window.supabaseClient
              .from('students')
              .insert([{ name, email }])
              .select();
            
            if (createError) {
              console.error('Error creating student:', createError);
              continue;
            }
            
            const studentId = newStudent[0].id;
            
            // Add student to class
            const { error: addError } = await window.supabaseClient
              .from('class_students')
              .insert([{
                class_id: currentClassId,
                student_id: studentId
              }]);
            
            if (addError) {
              console.error('Error adding student to class:', addError);
              continue;
            }
            
            addedCount++;
          }
          
          // Close modal
          document.getElementById('import-students-modal').style.display = 'none';
          
          // Reset file input
          fileInput.value = '';
          document.getElementById('import-students-submit-btn').disabled = true;
          
          // Reload students
          loadStudents(currentClassId);
          
          // Reload dashboard data
          loadDashboardData();
          
          showAlert(`Imported ${addedCount} students.`, 'success');
        } catch (error) {
          console.error('Error processing CSV:', error);
          showAlert('Error processing CSV: ' + error.message, 'error');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        showAlert('Error parsing CSV file', 'error');
      }
    });
  } catch (error) {
    console.error('Error importing students:', error);
    showAlert('Error importing students', 'error');
  }
}

/**
 * Load vocabulary lists for a class
 * @param {string} classId - The ID of the class
 */
async function loadVocabularyLists(classId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('vocabulary_lists')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    renderVocabularyLists(data);
  } catch (error) {
    console.error('Error loading vocabulary lists:', error);
    showAlert('Error loading vocabulary lists', 'error');
  }
}

/**
 * Render vocabulary lists in the UI
 * @param {Array} lists - Array of vocabulary list objects
 */
function renderVocabularyLists(lists) {
  const listsContainer = document.getElementById('vocabulary-lists-container');
  const noListsMessage = document.getElementById('no-vocabulary-lists-message');
  
  // Check if elements exist
  if (!listsContainer) {
    console.error('Element with ID "vocabulary-lists-container" not found');
    return;
  }
  
  if (!noListsMessage) {
    console.error('Element with ID "no-vocabulary-lists-message" not found');
    // Continue anyway, as we can still render the lists
  }
  
  // Clear existing content
  listsContainer.innerHTML = '';
  
  if (lists.length === 0) {
    if (noListsMessage) {
      noListsMessage.classList.remove('hidden');
    }
    return;
  }
  
  if (noListsMessage) {
    noListsMessage.classList.add('hidden');
  }
  
  // Create list cards
  lists.forEach(list => {
    const listCard = document.createElement('div');
    listCard.className = 'vocabulary-list-card';
    listCard.innerHTML = `
      <div class="vocabulary-list-card-header">
        <h3>${list.name}</h3>
      </div>
      <div class="vocabulary-list-card-footer">
        <button class="btn view-vocabulary-list-btn" data-list-id="${list.id}"><i class="fas fa-eye"></i> View List</button>
        <button class="btn btn-primary assign-list-btn" data-list-id="${list.id}" data-list-name="${list.name}"><i class="fas fa-share"></i> Assign</button>
        <button class="btn btn-danger delete-vocabulary-list-btn" data-list-id="${list.id}"><i class="fas fa-trash"></i> Delete</button>
      </div>
    `;
    
    listsContainer.appendChild(listCard);
    
    // Add event listeners
    listCard.querySelector('.view-vocabulary-list-btn').addEventListener('click', () => {
      viewVocabularyList(list.id, list.name);
    });
    
    listCard.querySelector('.assign-list-btn').addEventListener('click', () => {
      showAssignListModal(list.id, list.name);
    });
    
    listCard.querySelector('.delete-vocabulary-list-btn').addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete the vocabulary list "${list.name}"? This action cannot be undone.`)) {
        deleteVocabularyList(list.id);
      }
    });
  });
}

/**
 * Show the vocabulary tab
 */
function showVocabularyTab() {
  showSection('class-detail-section');
  activateTab('vocabulary');
}

/**
 * Handle adding a vocabulary list
 * @param {Event} event - The form submit event
 */
async function handleAddVocabularyList(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('vocabulary-list-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    showAlert('Please enter a list name', 'error');
    return;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('vocabulary_lists')
      .insert([{
        name,
        class_id: currentClassId
      }])
      .select();
    
    if (error) throw error;
    
    // Close modal
    document.getElementById('add-vocabulary-list-modal').style.display = 'none';
    
    // Reload vocabulary lists
    loadVocabularyLists(currentClassId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Vocabulary list created successfully', 'success');
  } catch (error) {
    console.error('Error creating vocabulary list:', error);
    showAlert('Error creating vocabulary list: ' + error.message, 'error');
  }
}

/**
 * Delete a vocabulary list
 * @param {string} listId - The ID of the list to delete
 */
async function deleteVocabularyList(listId) {
  try {
    const { error } = await window.supabaseClient
      .from('vocabulary_lists')
      .delete()
      .eq('id', listId);
    
    if (error) throw error;
    
    // Reload vocabulary lists
    loadVocabularyLists(currentClassId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Vocabulary list deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting vocabulary list:', error);
    showAlert('Error deleting vocabulary list: ' + error.message, 'error');
  }
}

/**
 * View a vocabulary list
 * @param {string} listId - The ID of the list to view
 * @param {string} listName - The name of the list
 */
async function viewVocabularyList(listId, listName) {
  try {
    currentVocabularyListId = listId;
    
    // Update UI
    document.getElementById('vocabulary-list-detail-title').textContent = listName;
    
    // Show vocabulary list detail section
    showSection('vocabulary-list-detail-section');
    
    // Load vocabulary words
    loadVocabularyWords(listId);
  } catch (error) {
    console.error('Error viewing vocabulary list:', error);
    showAlert('Error viewing vocabulary list', 'error');
  }
}

/**
 * Load vocabulary words for a list
 * @param {string} listId - The ID of the vocabulary list
 */
async function loadVocabularyWords(listId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('vocabulary_words')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    renderVocabularyWords(data);
  } catch (error) {
    console.error('Error loading vocabulary words:', error);
    showAlert('Error loading vocabulary words', 'error');
  }
}

/**
 * Render vocabulary words in the UI
 * @param {Array} words - Array of vocabulary word objects
 */
function renderVocabularyWords(words) {
  const vocabularyWordsContainer = document.getElementById('vocabulary-words-container');
  vocabularyWordsContainer.innerHTML = '';

  if (words.length === 0) {
    vocabularyWordsContainer.innerHTML = '<p>No vocabulary words found. Add some words to get started!</p>';
    return;
  }

  words.forEach(word => {
    const wordElement = document.createElement('div');
    wordElement.className = 'vocabulary-word';
    wordElement.dataset.id = word.id;

    const wordHeader = document.createElement('div');
    wordHeader.className = 'vocabulary-word-header';
    
    const wordTitle = document.createElement('h3');
    wordTitle.textContent = word.word;
    
    const wordActions = document.createElement('div');
    wordActions.className = 'vocabulary-word-actions';
    
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-small edit-vocabulary-word-btn';
    editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editButton.dataset.id = word.id;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-small btn-danger delete-vocabulary-word-btn';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteButton.dataset.id = word.id;
    
    wordActions.appendChild(editButton);
    wordActions.appendChild(deleteButton);
    
    wordHeader.appendChild(wordTitle);
    wordHeader.appendChild(wordActions);
    
    const wordContent = document.createElement('div');
    wordContent.className = 'vocabulary-word-content';
    
    if (word.definition) {
      const definitionElement = document.createElement('p');
      definitionElement.innerHTML = '<strong>Definition:</strong> ' + word.definition;
      wordContent.appendChild(definitionElement);
    }
    
    if (word.sample_sentence) {
      const sampleSentenceElement = document.createElement('p');
      sampleSentenceElement.innerHTML = '<strong>Sample Sentence:</strong> ' + word.sample_sentence;
      wordContent.appendChild(sampleSentenceElement);
    }
    
    if (word.image_url) {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'vocabulary-word-image';
      
      const image = document.createElement('img');
      image.src = word.image_url;
      image.alt = word.word;
      
      imageContainer.appendChild(image);
      wordContent.appendChild(imageContainer);
    }
    
    if (word.chinese_translation) {
      const chineseElement = document.createElement('p');
      chineseElement.innerHTML = '<strong>Chinese:</strong> ' + word.chinese_translation;
      wordContent.appendChild(chineseElement);
    }
    
    wordElement.appendChild(wordHeader);
    wordElement.appendChild(wordContent);
    
    vocabularyWordsContainer.appendChild(wordElement);
    
    // Add event listeners
    editButton.addEventListener('click', () => {
      editVocabularyWord(word);
    });
    
    deleteButton.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete the word "${word.word}"?`)) {
        deleteVocabularyWord(word.id);
      }
    });
  });
}

/**
 * Handle adding a vocabulary word
 * @param {Event} event - The form submit event
 */
async function handleAddVocabularyWord(event) {
  event.preventDefault();
  
  const wordInput = document.getElementById('vocabulary-word');
  const definitionInput = document.getElementById('vocabulary-definition');
  const sampleSentenceInput = document.getElementById('vocabulary-sample-sentence');
  const imageInput = document.getElementById('vocabulary-image');
  const imageUploadInput = document.getElementById('vocabulary-image-upload');
  const chineseInput = document.getElementById('vocabulary-chinese');
  
  const word = wordInput.value.trim();
  const definition = definitionInput.value.trim();
  const sampleSentence = sampleSentenceInput.value.trim();
  const imageUrl = imageInput.value.trim();
  const chineseTranslation = chineseInput.value.trim();
  
  if (!word) {
    showAlert('Please enter a word', 'error');
    return;
  }
  
  try {
    // Show loading indicator
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    // Handle image upload if a file is selected
    let finalImageUrl = imageUrl;
    const imageFile = imageUploadInput.files[0];
    
    if (imageFile) {
      try {
        finalImageUrl = await uploadVocabularyImage(imageFile);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        showAlert('Error uploading image: ' + uploadError.message, 'error');
        
        // Reset button state
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }
    }
    
    const { data, error } = await window.supabaseClient
      .from('vocabulary_words')
      .insert([{
        word,
        definition: definition || null,
        sample_sentence: sampleSentence || null,
        image_url: finalImageUrl || null,
        chinese_translation: chineseTranslation || null,
        list_id: currentVocabularyListId
      }])
      .select();
    
    if (error) throw error;
    
    // Reset form
    event.target.reset();
    removeImagePreview();
    
    // Close modal
    document.getElementById('add-vocabulary-word-modal').style.display = 'none';
    
    // Reload vocabulary words
    loadVocabularyWords(currentVocabularyListId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Vocabulary word added successfully', 'success');
  } catch (error) {
    console.error('Error adding vocabulary word:', error);
    showAlert('Error adding vocabulary word: ' + error.message, 'error');
  } finally {
    // Reset button state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Word';
    submitBtn.disabled = false;
  }
}

/**
 * Delete a vocabulary word
 * @param {string} wordId - The ID of the word to delete
 */
async function deleteVocabularyWord(wordId) {
  try {
    const { error } = await window.supabaseClient
      .from('vocabulary_words')
      .delete()
      .eq('id', wordId);
    
    if (error) throw error;
    
    // Reload vocabulary words
    loadVocabularyWords(currentVocabularyListId);
    
    // Reload dashboard data
    loadDashboardData();
    
    showAlert('Vocabulary word deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting vocabulary word:', error);
    showAlert('Error deleting vocabulary word: ' + error.message, 'error');
  }
}

/**
 * Handle image preview
 * @param {Event} event - The file input change event
 */
function handleImagePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check file type
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    showAlert('Please upload a valid image format (JPEG or PNG)', 'error');
    return;
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('Image size exceeds 5MB limit', 'error');
    return;
  }
  
  // Handle image preview
  const imagePreview = document.getElementById('vocabulary-image-preview');
  const previewImg = document.getElementById('vocabulary-preview-img');
  const reader = new FileReader();
  
  reader.onload = function(e) {
    previewImg.src = e.target.result;
    imagePreview.classList.remove('hidden');
  };
  
  reader.readAsDataURL(file);
}

/**
 * Remove image preview
 */
function removeImagePreview() {
  const imageUpload = document.getElementById('vocabulary-image-upload');
  const imagePreview = document.getElementById('vocabulary-image-preview');
  const previewImg = document.getElementById('vocabulary-preview-img');
  
  imageUpload.value = '';
  previewImg.src = '#';
  imagePreview.classList.add('hidden');
}

/**
 * Set up drag and drop functionality for file uploads
 * @param {string} containerId - The ID of the container element
 * @param {string} fileInputId - The ID of the file input element
 * @param {Function} handleFunction - The function to call when a file is dropped
 */
function setupDragAndDrop(containerId, fileInputId, handleFunction) {
  const container = document.getElementById(containerId);
  const fileInput = document.getElementById(fileInputId);
  
  if (!container || !fileInput) {
    console.error(`Elements not found for drag and drop setup: ${containerId}, ${fileInputId}`);
    return;
  }
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    container.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    container.addEventListener(eventName, unhighlight, false);
  });
  
  // Handle dropped files
  container.addEventListener('drop', handleDrop, false);
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  function highlight() {
    container.classList.add('highlight');
  }
  
  function unhighlight() {
    container.classList.remove('highlight');
  }
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      fileInput.files = files;
      // Trigger the change event manually
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  }
}

/**
 * Resize an image to specified dimensions
 * @param {File} file - The image file to resize
 * @param {number} maxWidth - The maximum width of the resized image
 * @param {number} maxHeight - The maximum height of the resized image
 * @returns {Promise<Blob>} - A promise that resolves with the resized image blob
 */
function resizeImage(file, maxWidth = 800, maxHeight = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Create canvas and resize image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => resolve(blob),
          file.type,
          0.85 // Quality parameter for JPEG
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image to Supabase storage
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - A promise that resolves with the public URL of the uploaded image
 */
async function uploadVocabularyImage(file) {
  try {
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `vocabulary/${fileName}`;
    
    // Resize the image before uploading
    const resizedImage = await resizeImage(file);
    
    // Upload to Supabase storage
    const { data, error } = await window.supabaseClient
      .storage
      .from('vocabulary-images')
      .upload(filePath, resizedImage, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (error) throw error;
    
    // Get the public URL
    const { data: urlData } = window.supabaseClient
      .storage
      .from('vocabulary-images')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Edit a vocabulary word
 * @param {Object} word - The vocabulary word object to edit
 */
function editVocabularyWord(word) {
  try {
    // Create a modal for editing
    const modalHTML = `
      <div id="edit-vocabulary-word-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Edit Vocabulary Word</h2>
          <form id="edit-vocabulary-word-form">
            <div class="form-group">
              <label for="edit-vocabulary-word">Word</label>
              <input type="text" id="edit-vocabulary-word" name="edit-vocabulary-word" value="${word.word}" required>
            </div>
            <div class="form-group">
              <label for="edit-vocabulary-definition">Definition (Optional)</label>
              <textarea id="edit-vocabulary-definition" name="edit-vocabulary-definition" rows="2">${word.definition || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-vocabulary-sample-sentence">Sample Sentence (Optional)</label>
              <textarea id="edit-vocabulary-sample-sentence" name="edit-vocabulary-sample-sentence" rows="2">${word.sample_sentence || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-vocabulary-image-upload">Image (Optional)</label>
              <div class="image-upload-container">
                <input type="file" id="edit-vocabulary-image-upload" name="edit-vocabulary-image-upload" accept="image/*">
                <div id="edit-vocabulary-image-preview" class="image-preview ${word.image_url ? '' : 'hidden'}">
                  <img id="edit-vocabulary-preview-img" src="${word.image_url || '#'}" alt="Preview" ${word.image_url ? '' : 'style="display:none;"'}>
                  <button type="button" id="edit-remove-image-btn" class="btn btn-small btn-danger">Remove</button>
                </div>
                <p class="help-text">Images will be automatically resized. Max file size: 5MB.</p>
              </div>
              <input type="hidden" id="edit-vocabulary-image" name="edit-vocabulary-image" value="${word.image_url || ''}">
            </div>
            <div class="form-group">
              <label for="edit-vocabulary-chinese">Chinese Translation (Optional)</label>
              <input type="text" id="edit-vocabulary-chinese" name="edit-vocabulary-chinese" value="${word.chinese_translation || ''}">
            </div>
            <div class="form-group">
              <button type="submit" class="btn">Update Word</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('edit-vocabulary-word-modal');
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
      modal.remove();
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    // Image upload and preview
    const imageUpload = document.getElementById('edit-vocabulary-image-upload');
    const imagePreview = document.getElementById('edit-vocabulary-image-preview');
    const previewImg = document.getElementById('edit-vocabulary-preview-img');
    const removeImageBtn = document.getElementById('edit-remove-image-btn');
    const imageInput = document.getElementById('edit-vocabulary-image');
    
    imageUpload.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      // Check file type
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        showAlert('Please upload a valid image format (JPEG or PNG)', 'error');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Image size exceeds 5MB limit', 'error');
        return;
      }
      
      // Handle image preview
      const reader = new FileReader();
      
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        previewImg.style.display = '';
        imagePreview.classList.remove('hidden');
      };
      
      reader.readAsDataURL(file);
    });
    
    removeImageBtn.addEventListener('click', () => {
      imageUpload.value = '';
      previewImg.src = '#';
      previewImg.style.display = 'none';
      imageInput.value = '';
      imagePreview.classList.add('hidden');
    });
    
    // Form submission
    document.getElementById('edit-vocabulary-word-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const wordInput = document.getElementById('edit-vocabulary-word');
      const definitionInput = document.getElementById('edit-vocabulary-definition');
      const sampleSentenceInput = document.getElementById('edit-vocabulary-sample-sentence');
      const imageInput = document.getElementById('edit-vocabulary-image');
      const imageUploadInput = document.getElementById('edit-vocabulary-image-upload');
      const chineseInput = document.getElementById('edit-vocabulary-chinese');
      
      const updatedWord = wordInput.value.trim();
      const updatedDefinition = definitionInput.value.trim();
      const updatedSampleSentence = sampleSentenceInput.value.trim();
      const currentImageUrl = imageInput.value.trim();
      const updatedChineseTranslation = chineseInput.value.trim();
      
      if (!updatedWord) {
        showAlert('Please enter a word', 'error');
        return;
      }
      
      try {
        // Show loading indicator
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;
        
        // Handle image upload if a file is selected
        let finalImageUrl = currentImageUrl;
        const imageFile = imageUploadInput.files[0];
        
        if (imageFile) {
          try {
            finalImageUrl = await uploadVocabularyImage(imageFile);
          } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            showAlert('Error uploading image: ' + uploadError.message, 'error');
            
            // Reset button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            return;
          }
        }
        
        // If image was removed, set to null
        if (imagePreview.classList.contains('hidden')) {
          finalImageUrl = null;
        }
        
        const { error } = await window.supabaseClient
          .from('vocabulary_words')
          .update({
            word: updatedWord,
            definition: updatedDefinition || null,
            sample_sentence: updatedSampleSentence || null,
            image_url: finalImageUrl,
            chinese_translation: updatedChineseTranslation || null
          })
          .eq('id', word.id);
        
        if (error) throw error;
        
        // Remove modal
        modal.remove();
        
        // Reload vocabulary words
        loadVocabularyWords(currentVocabularyListId);
        
        showAlert('Vocabulary word updated successfully', 'success');
      } catch (error) {
        console.error('Error updating vocabulary word:', error);
        showAlert('Error updating vocabulary word: ' + error.message, 'error');
        
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Word';
        submitBtn.disabled = false;
      }
    });
  } catch (error) {
    console.error('Error editing vocabulary word:', error);
    showAlert('Error editing vocabulary word: ' + error.message, 'error');
  }
}

/**
 * Show all students across all classes
 */
async function viewAllStudents() {
  try {
    // Create a modal for viewing all students
    const modalHTML = `
      <div id="all-students-modal" class="modal">
        <div class="modal-content modal-large">
          <span class="close">&times;</span>
          <h2>All Students</h2>
          <div class="search-container">
            <input type="text" id="student-search" placeholder="Search students...">
          </div>
          <table id="all-students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
              </tr>
            </thead>
            <tbody id="all-students-list">
              <tr>
                <td colspan="2" class="text-center">Loading students...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('all-students-modal');
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
      modal.remove();
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    // Add search functionality
    document.getElementById('student-search').addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      const rows = document.querySelectorAll('#all-students-list tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
      });
    });
    
    // Get all classes for this teacher
    const { data: classes, error: classesError } = await window.supabaseClient
      .from('classes')
      .select('id, name')
      .eq('teacher_id', currentTeacher.id);
    
    if (classesError) throw classesError;
    
    if (classes.length === 0) {
      document.getElementById('all-students-list').innerHTML = `
        <tr>
          <td colspan="2" class="text-center">No classes found. Create a class first.</td>
        </tr>
      `;
      return;
    }
    
    // Create a map of class IDs to names for quick lookup
    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.id] = cls.name;
    });
    
    // Get all students for these classes
    const classIds = classes.map(cls => cls.id);
    
    const { data: classStudents, error: studentsError } = await window.supabaseClient
      .from('class_students')
      .select(`
        id,
        class_id,
        students (
          id,
          name
        )
      `)
      .in('class_id', classIds);
    
    if (studentsError) throw studentsError;
    
    if (classStudents.length === 0) {
      document.getElementById('all-students-list').innerHTML = `
        <tr>
          <td colspan="2" class="text-center">No students found. Add students to your classes.</td>
        </tr>
      `;
      return;
    }
    
    // Render students
    const studentsList = document.getElementById('all-students-list');
    studentsList.innerHTML = '';
    
    classStudents.forEach(item => {
      const student = item.students;
      const className = classMap[item.class_id];
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${student.name}</td>
        <td>${className}</td>
      `;
      
      studentsList.appendChild(row);
    });
  } catch (error) {
    console.error('Error viewing all students:', error);
    showAlert('Error viewing all students: ' + error.message, 'error');
  }
}

/**
 * Show all vocabulary lists across all classes
 */
async function viewAllVocabulary() {
  try {
    // Create a modal for viewing all vocabulary lists
    const modalHTML = `
      <div id="all-vocabulary-modal" class="modal">
        <div class="modal-content modal-large">
          <span class="close">&times;</span>
          <h2>All Vocabulary Lists</h2>
          <div class="search-filters">
            <div class="search-container">
              <input type="text" id="vocabulary-search" placeholder="Search lists...">
            </div>
            <div class="filter-container">
              <select id="class-filter">
                <option value="">All Classes</option>
              </select>
            </div>
          </div>
          <table id="all-vocabulary-table">
            <thead>
              <tr>
                <th>List Name</th>
                <th>Words Count</th>
                <th>Class</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="all-vocabulary-list">
              <tr>
                <td colspan="4" class="text-center">Loading vocabulary lists...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('all-vocabulary-modal');
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
      modal.remove();
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    // Get all classes for this teacher
    const { data: classes, error: classesError } = await window.supabaseClient
      .from('classes')
      .select('id, name')
      .eq('teacher_id', currentTeacher.id);
    
    if (classesError) throw classesError;
    
    if (classes.length === 0) {
      document.getElementById('all-vocabulary-list').innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No classes found. Create a class first.</td>
        </tr>
      `;
      return;
    }
    
    // Create a map of class IDs to names for quick lookup
    const classMap = {};
    classes.forEach(cls => {
      classMap[cls.id] = cls.name;
      
      // Add to filter dropdown
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = cls.name;
      document.getElementById('class-filter').appendChild(option);
    });
    
    // Get all vocabulary lists for these classes
    const classIds = classes.map(cls => cls.id);
    
    const { data: lists, error: listsError } = await window.supabaseClient
      .from('vocabulary_lists')
      .select('*')
      .in('class_id', classIds)
      .order('created_at', { ascending: false });
    
    if (listsError) throw listsError;
    
    if (lists.length === 0) {
      document.getElementById('all-vocabulary-list').innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No vocabulary lists found. Create a vocabulary list first.</td>
        </tr>
      `;
      return;
    }
    
    // Get word counts for each list
    const listIds = lists.map(list => list.id);
    
    // Fetch all vocabulary words for these lists
    const { data: allWords, error: wordsError } = await window.supabaseClient
      .from('vocabulary_words')
      .select('list_id')
      .in('list_id', listIds);
    
    // Count words for each list in JavaScript
    const countMap = {};
    if (!wordsError && allWords) {
      // Initialize count for all lists to 0
      listIds.forEach(id => {
        countMap[id] = 0;
      });
      
      // Count words for each list
      allWords.forEach(word => {
        if (countMap[word.list_id] !== undefined) {
          countMap[word.list_id]++;
        } else {
          countMap[word.list_id] = 1;
        }
      });
    }
    
    // Store lists for filtering
    const allLists = lists;
    
    // Render lists function
    function renderFilteredLists(filteredLists) {
      const listContainer = document.getElementById('all-vocabulary-list');
      listContainer.innerHTML = '';
      
      if (filteredLists.length === 0) {
        listContainer.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">No lists match your filters.</td>
          </tr>
        `;
        return;
      }
      
      filteredLists.forEach(list => {
        const wordCount = countMap[list.id] || 0;
        const className = classMap[list.class_id] || 'Unknown Class';
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${list.name}</td>
          <td>${wordCount}</td>
          <td>${className}</td>
          <td>
            <button class="btn btn-sm view-list-btn" data-id="${list.id}" data-name="${list.name}">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-sm btn-primary assign-list-btn" data-id="${list.id}" data-name="${list.name}">
              <i class="fas fa-share"></i> Assign to Class
            </button>
          </td>
        `;
        
        listContainer.appendChild(row);
        
        // Add event listeners
        row.querySelector('.view-list-btn').addEventListener('click', () => {
          viewVocabularyList(list.id, list.name);
        });
        
        row.querySelector('.assign-list-btn').addEventListener('click', () => {
          showAssignListModal(list.id, list.name);
        });
      });
    }
    
    // Initial render
    renderFilteredLists(allLists);
    
    // Add search and filter functionality
    document.getElementById('vocabulary-search').addEventListener('input', applyFilters);
    document.getElementById('class-filter').addEventListener('change', applyFilters);
    
    function applyFilters() {
      const searchTerm = document.getElementById('vocabulary-search').value.toLowerCase();
      const classFilterValue = document.getElementById('class-filter').value;
      
      let filteredLists = allLists;
      
      // Apply class filter
      if (classFilterValue) {
        filteredLists = filteredLists.filter(list => list.class_id === classFilterValue);
      }
      
      // Apply search filter
      if (searchTerm) {
        filteredLists = filteredLists.filter(list => 
          list.name.toLowerCase().includes(searchTerm) || 
          classMap[list.class_id].toLowerCase().includes(searchTerm)
        );
      }
      
      renderFilteredLists(filteredLists);
    }
  } catch (error) {
    console.error('Error viewing all vocabulary:', error);
    showAlert('Error viewing all vocabulary: ' + error.message, 'error');
  }
}

/**
 * Load student activity results for a class
 * @param {string} classId - The ID of the class
 */
async function loadStudentResults(classId) {
  try {
    console.log('Loading student results for class:', classId);
    
    // Show loading state
    document.getElementById('student-results-container').innerHTML = '<div class="text-center">Loading results...</div>';
    
    // Get all students in this class for the filter dropdown
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
    
    // Populate student filter dropdown
    const studentFilter = document.getElementById('student-filter');
    studentFilter.innerHTML = '<option value="all">All Students</option>';
    
    studentsData.forEach(item => {
      const option = document.createElement('option');
      option.value = item.students.id;
      option.textContent = item.students.name;
      studentFilter.appendChild(option);
    });
    
    // Get student IDs for this class
    const studentIds = studentsData.map(item => item.students.id);
    
    if (studentIds.length === 0) {
      document.getElementById('student-results-container').innerHTML = '';
      document.getElementById('no-results-message').classList.remove('hidden');
      updateResultsSummary([], []);
      return;
    }
    
    // Get activity results for these students
    const { data: resultsData, error: resultsError } = await window.supabaseClient
      .from('activity_results')
      .select(`
        id,
        student_id,
        vocabulary_word_id,
        activity_type,
        is_correct,
        attempt_count,
        created_at,
        students (
          name
        ),
        vocabulary_words (
          word,
          list_id
        )
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });
    
    if (resultsError) throw resultsError;
    
    console.log(`Loaded ${resultsData.length} activity results`);
    
    // Check if we have results
    if (resultsData.length === 0) {
      document.getElementById('student-results-container').innerHTML = '';
      document.getElementById('no-results-message').classList.remove('hidden');
      updateResultsSummary([], []);
      return;
    }
    
    // Hide no results message
    document.getElementById('no-results-message').classList.add('hidden');
    
    // Store the results for filtering
    window.activityResults = resultsData;
    
    // Render the results
    renderStudentResults(resultsData);
    
    // Update summary statistics
    updateResultsSummary(resultsData, studentIds);
  } catch (error) {
    console.error('Error loading student results:', error);
    showAlert('Error loading student results: ' + error.message, 'error');
    document.getElementById('student-results-container').innerHTML = '';
    document.getElementById('no-results-message').classList.remove('hidden');
  }
}

/**
 * Render student activity results in the UI
 * @param {Array} results - Array of activity result objects
 */
function renderStudentResults(results) {
  const resultsContainer = document.getElementById('student-results-container');
  resultsContainer.innerHTML = '';
  
  // Group results by student
  const studentGroups = {};
  
  results.forEach(result => {
    const studentId = result.student_id;
    const studentName = result.students?.name || 'Unknown Student';
    
    if (!studentGroups[studentId]) {
      studentGroups[studentId] = {
        name: studentName,
        activities: {}
      };
    }
    
    // Group by activity type
    const activityType = result.activity_type;
    if (!studentGroups[studentId].activities[activityType]) {
      studentGroups[studentId].activities[activityType] = {
        results: [],
        correct: 0,
        total: 0
      };
    }
    
    // Add result to the activity group
    studentGroups[studentId].activities[activityType].results.push(result);
    studentGroups[studentId].activities[activityType].total++;
    if (result.is_correct) {
      studentGroups[studentId].activities[activityType].correct++;
    }
  });
  
  // Create student cards
  Object.keys(studentGroups).forEach(studentId => {
    const student = studentGroups[studentId];
    
    // Create student card
    const studentCard = document.createElement('div');
    studentCard.className = 'student-result-card';
    
    // Create student header
    const studentHeader = document.createElement('div');
    studentHeader.className = 'student-result-header';
    studentHeader.innerHTML = `
      <div class="student-name">${student.name}</div>
      <div class="toggle-icon">
        <i class="fas fa-chevron-down"></i>
      </div>
    `;
    
    // Create activities container
    const activitiesContainer = document.createElement('div');
    activitiesContainer.className = 'student-result-activities';
    
    // Add activities to container
    Object.keys(student.activities).forEach(activityType => {
      const activity = student.activities[activityType];
      const scorePercentage = Math.round((activity.correct / activity.total) * 100);
      
      // Format activity type for display
      let formattedActivityType = activityType;
      switch (activityType) {
        case 'matching_game':
          formattedActivityType = 'Matching Game';
          break;
        case 'picture_quiz':
          formattedActivityType = 'Picture Quiz';
          break;
        case 'spelling':
          formattedActivityType = 'Spelling';
          break;
        case 'bubble_pop':
          formattedActivityType = 'Bubble Pop';
          break;
      }
      
      // Create activity row
      const activityRow = document.createElement('div');
      activityRow.className = 'activity-row';
      activityRow.innerHTML = `
        <div class="activity-type">${formattedActivityType}</div>
        <div class="activity-score">
          <div class="score-value">${activity.correct}/${activity.total} (${scorePercentage}%)</div>
          <div class="score-bar">
            <div class="score-fill" style="width: ${scorePercentage}%"></div>
          </div>
          <button class="expand-button" data-activity="${activityType}">
            Details <i class="fas fa-chevron-down"></i>
          </button>
        </div>
      `;
      
      // Create activity details container
      const activityDetails = document.createElement('div');
      activityDetails.className = 'activity-details';
      activityDetails.setAttribute('data-activity', activityType);
      
      // Add result details
      activity.results.forEach(result => {
        const date = new Date(result.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        const detailRow = document.createElement('div');
        detailRow.className = 'detail-row';
        detailRow.innerHTML = `
          <div>${result.vocabulary_words?.word || 'Unknown Word'}</div>
          <div class="${result.is_correct ? 'result-correct' : 'result-incorrect'}">${result.is_correct ? 'Correct' : 'Incorrect'}</div>
          <div>${formattedDate}</div>
        `;
        
        activityDetails.appendChild(detailRow);
      });
      
      // Add activity row and details to container
      activitiesContainer.appendChild(activityRow);
      activitiesContainer.appendChild(activityDetails);
      
      // Add event listener to expand button
      activityRow.querySelector('.expand-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const activityType = e.currentTarget.getAttribute('data-activity');
        const detailsElement = activitiesContainer.querySelector(`.activity-details[data-activity="${activityType}"]`);
        const iconElement = e.currentTarget.querySelector('i');
        
        detailsElement.classList.toggle('expanded');
        iconElement.classList.toggle('rotated');
      });
    });
    
    // Add event listener to student header
    studentHeader.addEventListener('click', () => {
      activitiesContainer.classList.toggle('expanded');
      studentHeader.querySelector('.toggle-icon i').classList.toggle('rotated');
    });
    
    // Add elements to student card
    studentCard.appendChild(studentHeader);
    studentCard.appendChild(activitiesContainer);
    
    // Add student card to container
    resultsContainer.appendChild(studentCard);
  });
}

/**
 * Apply filters to the student results
 */
function applyResultsFilters() {
  // Get filter values
  const studentFilter = document.getElementById('student-filter').value;
  const activityFilter = document.getElementById('activity-filter').value;
  const resultFilter = document.getElementById('result-filter').value;
  
  // Get all results
  const allResults = window.activityResults || [];
  
  // Apply filters
  let filteredResults = allResults;
  
  // Student filter
  if (studentFilter !== 'all') {
    filteredResults = filteredResults.filter(result => result.student_id === studentFilter);
  }
  
  // Activity filter
  if (activityFilter !== 'all') {
    filteredResults = filteredResults.filter(result => result.activity_type === activityFilter);
  }
  
  // Result filter
  if (resultFilter === 'correct') {
    filteredResults = filteredResults.filter(result => result.is_correct);
  } else if (resultFilter === 'incorrect') {
    filteredResults = filteredResults.filter(result => !result.is_correct);
  }
  
  // Render filtered results
  renderStudentResults(filteredResults);
  
  // Update summary with filtered results
  const studentIds = [...new Set(filteredResults.map(result => result.student_id))];
  updateResultsSummary(filteredResults, studentIds);
  
  // Show/hide no results message
  if (filteredResults.length === 0) {
    document.getElementById('no-results-message').classList.remove('hidden');
    document.getElementById('student-results-container').innerHTML = '';
  } else {
    document.getElementById('no-results-message').classList.add('hidden');
  }
}

/**
 * Export student results to CSV
 */
function exportStudentResults() {
  try {
    // Get current results (filtered or all)
    const results = window.activityResults || [];
    
    if (results.length === 0) {
      showAlert('No results to export', 'error');
      return;
    }
    
    // Create CSV content
    let csvContent = 'Student,Word,Activity,Result,Date\n';
    
    results.forEach(result => {
      // Format date
      const date = new Date(result.created_at);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      // Format activity type
      let activityType = result.activity_type;
      switch (activityType) {
        case 'matching_game':
          activityType = 'Matching Game';
          break;
        case 'picture_quiz':
          activityType = 'Picture Quiz';
          break;
        case 'spelling':
          activityType = 'Spelling';
          break;
        case 'bubble_pop':
          activityType = 'Bubble Pop';
          break;
      }
      
      // Add row to CSV
      csvContent += `"${result.students?.name || 'Unknown'}","${result.vocabulary_words?.word || 'Unknown'}","${activityType}","${result.is_correct ? 'Correct' : 'Incorrect'}","${formattedDate}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Results exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting results:', error);
    showAlert('Error exporting results: ' + error.message, 'error');
  }
}

/**
 * Update the summary statistics for student results
 * @param {Array} results - Array of activity result objects
 * @param {Array} studentIds - Array of student IDs in this class
 */
function updateResultsSummary(results, studentIds) {
  const totalActivities = results.length;
  const correctAnswers = results.filter(result => result.is_correct).length;
  const successRate = totalActivities > 0 ? Math.round((correctAnswers / totalActivities) * 100) : 0;
  
  document.getElementById('total-activities').textContent = totalActivities;
  document.getElementById('correct-answers').textContent = correctAnswers;
  document.getElementById('success-rate').textContent = `${successRate}%`;
}

/**
 * Show a modal to assign a vocabulary list to a class
 * @param {string} listId - The ID of the list to assign
 * @param {string} listName - The name of the list
 */
async function showAssignListModal(listId, listName) {
  try {
    // Get all classes for this teacher
    const { data: classes, error: classesError } = await window.supabaseClient
      .from('classes')
      .select('id, name')
      .eq('teacher_id', currentTeacher.id);
    
    if (classesError) throw classesError;
    
    if (classes.length === 0) {
      showAlert('You need to create a class first before you can assign vocabulary lists.', 'error');
      return;
    }
    
    // Get the current list's class
    const { data: list, error: listError } = await window.supabaseClient
      .from('vocabulary_lists')
      .select('class_id')
      .eq('id', listId)
      .single();
    
    if (listError) throw listError;
    
    // Create options for the select dropdown, excluding the current class
    const classOptions = classes
      .filter(cls => cls.id !== list.class_id)
      .map(cls => `<option value="${cls.id}">${cls.name}</option>`)
      .join('');
    
    // Create modal HTML
    const modalHTML = `
      <div id="assign-list-modal" class="modal">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Assign List to Class</h2>
          <p>Assign "${listName}" to another class</p>
          <form id="assign-list-form">
            <div class="form-group">
              <label for="assign-class-select">Select Class</label>
              <select id="assign-class-select" required>
                <option value="">Choose a class...</option>
                ${classOptions}
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="make-copy" checked>
                Make a copy (recommended)
              </label>
              <p class="text-muted small">Making a copy allows each class to have their own version of the list.</p>
            </div>
            <div class="form-group">
              <button type="submit" class="btn">Assign List</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Add modal to the DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = document.getElementById('assign-list-modal');
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').addEventListener('click', () => {
      modal.remove();
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    // Handle form submission
    document.getElementById('assign-list-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const classId = document.getElementById('assign-class-select').value;
      const makeCopy = document.getElementById('make-copy').checked;
      
      if (!classId) {
        showAlert('Please select a class', 'error');
        return;
      }
      
      try {
        // Check if a list with the same or similar name already exists in the target class
        let copyName = makeCopy ? `${listName} (Copy)` : listName;
        
        const { data: existingLists, error: checkError } = await window.supabaseClient
          .from('vocabulary_lists')
          .select('name')
          .eq('class_id', classId)
          .in('name', [listName, copyName]);
        
        if (checkError) throw checkError;
        
        // If a list with the same or similar name exists and we're making a copy, 
        // generate a unique name with a number
        if (existingLists && existingLists.length > 0) {
          if (!makeCopy) {
            // If not making a copy and trying to assign to a class that already has it
            showAlert(`A vocabulary list named "${listName}" already exists in this class.`, 'error');
            return;
          }
          
          // Find a unique name by appending a number
          let counter = 1;
          let baseName = listName;
          while (existingLists.some(l => l.name === `${baseName} (Copy ${counter})`)) {
            counter++;
          }
          copyName = `${baseName} (Copy ${counter})`;
        }
        
        if (makeCopy) {
          // 1. Copy the list with the unique name
          const { data: newList, error: copyListError } = await window.supabaseClient
            .from('vocabulary_lists')
            .insert([{
              name: copyName,
              class_id: classId,
              created_at: new Date().toISOString()
            }])
            .select();
          
          if (copyListError) throw copyListError;
          
          const newListId = newList[0].id;
          
          // 2. Get all words from the original list
          const { data: words, error: wordsError } = await window.supabaseClient
            .from('vocabulary_words')
            .select('*')
            .eq('list_id', listId);
          
          if (wordsError) throw wordsError;
          
          // 3. Copy all words to the new list
          if (words.length > 0) {
            const newWords = words.map(word => ({
              word: word.word,
              definition: word.definition,
              sample_sentence: word.sample_sentence,
              chinese_translation: word.chinese_translation,
              image_url: word.image_url,
              list_id: newListId
            }));
            
            const { error: insertWordsError } = await window.supabaseClient
              .from('vocabulary_words')
              .insert(newWords);
            
            if (insertWordsError) throw insertWordsError;
          }
          
          showAlert(`Successfully copied "${listName}" to the selected class as "${copyName}"`, 'success');
        } else {
          // Just update the list's class_id
          const { error: updateError } = await window.supabaseClient
            .from('vocabulary_lists')
            .update({ class_id: classId })
            .eq('id', listId);
          
          if (updateError) throw updateError;
          
          showAlert(`Successfully assigned "${listName}" to the selected class`, 'success');
        }
        
        // Close modal
        modal.remove();
        
        // Refresh the view
        viewAllVocabulary();
      } catch (error) {
        console.error('Error assigning vocabulary list:', error);
        showAlert('Error assigning vocabulary list: ' + error.message, 'error');
      }
    });
  } catch (error) {
    console.error('Error preparing to assign vocabulary list:', error);
    showAlert('Error: ' + error.message, 'error');
  }
}

/**
 * Generate a QR code for a class
 * @param {string} classSlug - The slug of the class
 */
function generateQRCode(classSlug) {
  // Clear existing QR code
  const qrcodeContainer = document.getElementById('qrcode');
  qrcodeContainer.innerHTML = '';
  
  // Get the base URL
  const baseUrl = window.location.origin;
  const studentUrl = `${baseUrl}/student/index.html?class=${classSlug}`;
  
  // Display the URL
  document.getElementById('class-url').textContent = studentUrl;
  
  // Generate QR code
  new QRCode(qrcodeContainer, {
    text: studentUrl,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

/**
 * Download the QR code as an image
 */
function downloadQRCode() {
  const qrcodeImg = document.querySelector('#qrcode img');
  
  if (!qrcodeImg) {
    showAlert('QR code has not been generated yet.', 'error');
    return;
  }
  
  // Create a canvas element to draw the QR code
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set canvas dimensions to match QR code
  canvas.width = qrcodeImg.width;
  canvas.height = qrcodeImg.height;
  
  // Draw QR code on canvas
  context.drawImage(qrcodeImg, 0, 0, canvas.width, canvas.height);
  
  // Convert canvas to data URL
  const dataUrl = canvas.toDataURL('image/png');
  
  // Create a download link
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `class-qrcode-${window.currentClassSlug}.png`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showAlert('QR code downloaded successfully', 'success');
}