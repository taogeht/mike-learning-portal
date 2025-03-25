# Student Learning Portal

A web application for teachers to manage classes, students, and vocabulary lists, and for students to access learning materials.

## Features

### Teacher Portal
- Create and manage classes
- Add and import students
- Create vocabulary lists
- Add and import vocabulary words with definitions, images, and translations

### Student Portal
- Access class via unique URL (www.domain.com/{classname})
- Simple one-digit passcode authentication
- View vocabulary lists and words

## Setup Instructions

### Database Setup
1. Run the SQL script in `db/schema_update.sql` to update your database schema.
2. This will add the necessary `passcode` field to the students table.

### Server Configuration
1. Upload all files to your web server.
2. Ensure the `.htaccess` file is properly configured for URL rewriting.
3. Make sure your web server has mod_rewrite enabled.

### URL Structure
- Teacher Portal: `www.domain.com/teacher/`
- Student Portal: `www.domain.com/student/index.html?class={classname}`

## Student Access

1. Teachers create a class with a unique name.
2. The system generates a URL with the class slug as a query parameter (e.g., `www.domain.com/student/index.html?class=math-class-101`).
3. Students visit this URL and see a grid of student names.
4. When a student selects their name:
   - If it's their first login, they enter a one-digit passcode that will be saved for future logins.
   - If they've logged in before, they enter their existing passcode.
5. After successful authentication, students can access vocabulary lists and learning materials.

## Technical Details

- Frontend: HTML, CSS, JavaScript
- Backend: Supabase (PostgreSQL database with RESTful API)
- Authentication: Custom passcode system for students, Supabase Auth for teachers

## Development

To modify the application:
1. Edit HTML files in the root directory and in the `teacher/` and `student/` folders.
2. Modify CSS styles in the `css/` directory.
3. Update JavaScript functionality in the `js/` directory.

## License

© 2025 Student Learning Portal. All rights reserved.
