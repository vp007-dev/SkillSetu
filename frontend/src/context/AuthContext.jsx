import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { loginUser, registerUser, loginWithGoogle, fetchCandidates, createCandidate, deleteCandidate } from '../api/client';

const AuthContext = createContext(null);

// Migrate saved sign-in, profile, and interview state to the SkillSetu namespace.
const legacyStorageKeys = [
  'user', 'token', 'active_candidate_id', 'resume_text', 'raw_resume',
  'parsed_resume', 'session_id', 'interview_history',
];
try {
  for (const suffix of legacyStorageKeys) {
    const oldKey = `careeros_${suffix}`;
    const newKey = `skillsetu_${suffix}`;
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, oldValue);
    if (oldValue !== null) localStorage.removeItem(oldKey);
  }
} catch {
  // Storage can be unavailable in restricted browser contexts; auth initialization handles that separately.
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('skillsetu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('skillsetu_token') || null;
  });

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateIdState] = useState(() => {
    return localStorage.getItem('skillsetu_active_candidate_id') || 'all';
  });

  const [loading, setLoading] = useState(false);

  const setSelectedCandidateId = (id) => {
    setSelectedCandidateIdState(id);
    localStorage.setItem('skillsetu_active_candidate_id', id);
  };

  const refreshCandidates = useCallback(async (userId = null) => {
    try {
      const targetUser = userId || user?.id;
      const res = await fetchCandidates(targetUser);
      if (res?.candidates) {
        setCandidates(res.candidates);
        if (selectedCandidateId !== 'all' && !res.candidates.find(c => c.id === selectedCandidateId)) {
          if (res.candidates.length > 0) {
            setSelectedCandidateId(res.candidates[0].id);
          } else {
            setSelectedCandidateId('all');
          }
        }
      }
    } catch (err) {
      console.warn('[Candidates Load Error]', err);
    }
  }, [user?.id, selectedCandidateId]);

  useEffect(() => {
    if (user?.id) {
      refreshCandidates(user.id);
    }
  }, [user?.id]);

  const addCandidatePersona = async (candidateData) => {
    setLoading(true);
    try {
      const res = await createCandidate(candidateData);
      await refreshCandidates(user?.id);
      if (res?.candidate?.id) {
        setSelectedCandidateId(res.candidate.id);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const removeCandidatePersona = async (candidateId) => {
    setLoading(true);
    try {
      const res = await deleteCandidate(candidateId);
      await refreshCandidates(user?.id);
      setSelectedCandidateId('all');
      return res;
    } finally {
      setLoading(false);
    }
  };

  const syncFirebaseAuthUser = async (fbUser, fbToken) => {
    try {
      const email = fbUser.email;
      const name = fbUser.displayName || email.split('@')[0];
      const avatar_url = fbUser.photoURL;
      
      const res = await loginWithGoogle({
        email,
        name,
        avatar_url,
        google_id: fbUser.uid
      });

      if (res.user) {
        const prevUserStr = localStorage.getItem('skillsetu_user');
        let prevUserId = null;
        try {
          prevUserId = prevUserStr ? JSON.parse(prevUserStr)?.id : null;
        } catch {}

        if (prevUserId && prevUserId !== res.user.id) {
          localStorage.removeItem('skillsetu_active_candidate_id');
          setSelectedCandidateIdState('all');
          setCandidates([]);
        }

        setUser(res.user);
        const activeToken = res.token || fbToken;
        setToken(activeToken);
        localStorage.setItem('skillsetu_user', JSON.stringify(res.user));
        localStorage.setItem('skillsetu_token', activeToken);
        await refreshCandidates(res.user.id);
        return res.user;
      }
    } catch (err) {
      console.error('[Firebase Auth Sync Error]', err);
    }
  };

  // Listen to live Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const fbToken = await fbUser.getIdToken();
        await syncFirebaseAuthUser(fbUser, fbToken);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogleOAuth = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        const fbToken = await result.user.getIdToken();
        return await syncFirebaseAuthUser(result.user, fbToken);
      }
    } catch (err) {
      console.warn('[Firebase Google Auth Notice]', err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithDirectGoogle = async (googleData) => {
    setLoading(true);
    try {
      const res = await loginWithGoogle(googleData);
      if (res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('skillsetu_user', JSON.stringify(res.user));
        localStorage.setItem('skillsetu_token', res.token);
        await refreshCandidates(res.user.id);
        return res.user;
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential?.user) {
          const fbToken = await userCredential.user.getIdToken();
          return await syncFirebaseAuthUser(userCredential.user, fbToken);
        }
      } catch {}

      const res = await loginUser({ email, password });
      if (res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('skillsetu_user', JSON.stringify(res.user));
        localStorage.setItem('skillsetu_token', res.token);
        await refreshCandidates(res.user.id);
        return res.user;
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, role) => {
    setLoading(true);
    try {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch {}

      const res = await registerUser({ email, password, name, role });
      if (res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('skillsetu_user', JSON.stringify(res.user));
        localStorage.setItem('skillsetu_token', res.token);
        await refreshCandidates(res.user.id);
        return res.user;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setToken(null);
    setCandidates([]);
    setSelectedCandidateIdState('all');
    localStorage.removeItem('skillsetu_user');
    localStorage.removeItem('skillsetu_token');
    localStorage.removeItem('skillsetu_active_candidate_id');
  };

  const activeCandidate = candidates.find(c => c.id === selectedCandidateId) || null;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      candidates,
      selectedCandidateId,
      setSelectedCandidateId,
      activeCandidate,
      refreshCandidates,
      addCandidatePersona,
      removeCandidatePersona,
      login,
      register,
      signInWithGoogleOAuth,
      loginWithDirectGoogle,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
