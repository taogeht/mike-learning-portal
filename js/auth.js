// Authentication functions for Student Learning Portal
console.log('Auth.js loaded');

const Auth = {
  async signIn(email, password) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('User signed in:', data.user.id);
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error.message);
      return { data: null, error };
    }
  },

  async signOut() {
    try {
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) throw error;
      console.log('User signed out');
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error.message);
      return { error };
    }
  },

  async getSession() {
    try {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      console.error('Error getting session:', error.message);
      return { session: null, error };
    }
  },

  async requireAuth() {
    try {
      const { session, error } = await this.getSession();
      if (error) throw error;
      
      if (!session) {
        console.log('No active session, redirecting to login');
        // Check if we're in the teacher directory
        const isTeacherPath = window.location.pathname.includes('/teacher/');
        const loginPath = isTeacherPath ? 'login.html' : '../teacher/login.html';
        window.location.href = loginPath;
        return false;
      }
      
      console.log('Active session found:', session.user.id);
      return true;
    } catch (error) {
      console.error('Error in requireAuth:', error.message);
      window.location.href = '../teacher/login.html';
      return false;
    }
  },

  async getUserProfile() {
    try {
      const { session, error: sessionError } = await this.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await window.supabaseClient
        .from('teachers')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      console.log('Teacher profile loaded:', data);
      return { profile: data, error: null };
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      return { profile: null, error };
    }
  }
};

// Export Auth object to window
window.Auth = Auth;
console.log('Auth object exported to window:', window.Auth ? 'Yes' : 'No'); 