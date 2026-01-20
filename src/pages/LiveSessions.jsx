import { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { liveService } from '../services/liveService';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { format } from 'date-fns';
import './LiveSessions.css';
import './teacher/TeacherAttendance.css';

const LiveSessions = () => {
  const { currentUser, userData, isTeacher } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState([]); // Ko'p efirlar uchun
  const [selectedSession, setSelectedSession] = useState(null); // Talaba tanlagan efir
  const [liveLoading, setLiveLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [teachersMap, setTeachersMap] = useState({}); // O'qituvchilar ma'lumotlari

  // Google OAuth login
  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleAccessToken(tokenResponse.access_token);
      setIsGoogleAuthenticated(true);
      toast.success(t('liveSessions.googleAuthSuccess'));
    },
    onError: () => {
      toast.error(t('liveSessions.googleAuthError'));
    },
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
  });

  // Load groups (for teachers) and initialize selected group
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (!userData) {
          setLoading(false);
          return;
        }

        if (isTeacher && currentUser) {
          const res = await groupService.getGroupsByTeacher(currentUser.uid);
          if (res.success) {
            setGroups(res.data || []);
            if (!selectedGroupId) {
              const first = (res.data || [])[0];
              if (first) setSelectedGroupId(first.id);
            }
          }
        } else {
          // student: use groupId from profile if available
          const gid = userData?.groupId || userData?.group?.id || null;
          if (gid) setSelectedGroupId(gid);
        }
      } catch (err) {
        console.error('Init LiveSessions error', err);
      }
      setLoading(false);
    };

    init();
  }, [userData, isTeacher, currentUser]);

  // Whenever selected group changes, load active sessions for that group
  useEffect(() => {
    const loadActive = async () => {
      if (!selectedGroupId) {
        setLiveSessions([]);
        setSelectedSession(null);
        return;
      }
      setLiveLoading(true);
      const teacherId = isTeacher ? currentUser?.uid : null;
      const res = await liveService.getActiveSessionsForGroup(selectedGroupId, teacherId);
      if (res.success) {
        const sessions = res.data || [];
        setLiveSessions(sessions);
        
        // O'qituvchilar ma'lumotlarini yuklash (talabalar uchun)
        if (!isTeacher && sessions.length > 0) {
          const uniqueTeacherIds = [...new Set(sessions.map(s => s.teacherId).filter(Boolean))];
          const teachers = {};
          for (const tid of uniqueTeacherIds) {
            try {
              const teacherDoc = await getDoc(doc(db, 'users', tid));
              if (teacherDoc.exists()) {
                teachers[tid] = teacherDoc.data();
              }
            } catch (error) {
              console.error('Get teacher error:', error);
            }
          }
          setTeachersMap(teachers);
        }
        
        // O'qituvchi uchun: birinchi efirni tanlash, talaba uchun: tanlanmagan
        if (isTeacher && sessions.length > 0) {
          setSelectedSession(sessions[0]);
        } else {
          setSelectedSession(null);
        }
      } else {
        setLiveSessions([]);
        setSelectedSession(null);
      }
      setLiveLoading(false);
    };

    loadActive();
  }, [selectedGroupId, isTeacher, currentUser]);

  const startLive = async () => {
    const groupId = selectedGroupId;
    if (!groupId) return toast.error(t('liveSessions.groupNotSelected'));

    if (!googleAccessToken) {
      toast.warning(t('liveSessions.googleAuthRequired'));
      googleLogin();
      return;
    }

    setLiveLoading(true);
    try {
      const groupName = groups.find(g => g.id === groupId)?.name || `Group ${groupId}`;
      const summary = `${groupName} - ${t('liveSessions.liveLesson')}`;

      const res = await liveService.createSession({
        groupId,
        teacherId: currentUser.uid,
        googleAccessToken,
        summary,
        attendees: []
      });

      if (res.success) {
        // Yangi efirni ro'yxatga qo'shish
        setLiveSessions(prev => [...prev, res.data]);
        setSelectedSession(res.data);
        toast.success(t('liveSessions.broadcastStarted'));
      } else {
        toast.error(res.error || t('liveSessions.startError'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('liveSessions.errorOccurred'));
    }
    setLiveLoading(false);
  };

  const stopLive = async (sessionId) => {
    if (!sessionId) return;
    setLiveLoading(true);

    const res = await liveService.endSession(sessionId, googleAccessToken, currentUser.uid);

    if (res.success) {
      // Ro'yxatdan olib tashlash
      setLiveSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);
        // Agar tanlangan efir to'xtatilgan bo'lsa, boshqa efirni tanlash yoki null
        if (selectedSession?.id === sessionId) {
          setSelectedSession(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      toast.info(t('liveSessions.broadcastEnded'));
    } else {
      toast.error(res.error || t('liveSessions.endError'));
    }
    setLiveLoading(false);
  };

  const getMeetLink = (session) => {
    if (!session) return null;
    return session.meetData?.meetLink || session.meetData?.htmlLink || null;
  };

  if (loading) return <LoadingSpinner />;

  // O'qituvchi uchun: faqat o'z efirlarini ko'rsatish
  // Talaba uchun: barcha efirlarni ko'rsatish va tanlash imkoniyati
  const displaySessions = isTeacher 
    ? liveSessions.filter(s => s.teacherId === currentUser?.uid)
    : liveSessions;

  const meetLink = getMeetLink(selectedSession);

  return (
    <div className="live-sessions-page">
      <div className="page-breadcrumb">{t('sidebar.liveLessons')}</div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600 }}>{t('teacher.attendance.group')}:</label>
          {isTeacher ? (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6 }}
            >
              <option value="">-- {t('teacher.attendance.group')} {t('common.select')} --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          ) : (
            <span>{groups.find(g => g.id === selectedGroupId)?.name || userData?.groupName || t('common.notSet')}</span>
          )}

          {isTeacher && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {!isGoogleAuthenticated && displaySessions.length === 0 && (
                <button
                  className="btn-edit"
                  onClick={googleLogin}
                >
                  {t('liveSessions.connectGoogle')}
                </button>
              )}

              <button
                className="btn-edit"
                onClick={startLive}
                disabled={liveLoading || !selectedGroupId || !googleAccessToken}
              >
                {t('liveSessions.startBroadcast')}
              </button>
            </div>
          )}
        </div>

        {/* Talaba uchun: barcha efirlarni ko'rsatish va tanlash */}
        {!isTeacher && displaySessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{t('liveSessions.selectSession') || 'Jonli efirni tanlang'}</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {displaySessions.map(session => {
                const sessionLink = getMeetLink(session);
                const isSelected = selectedSession?.id === session.id;
                const teacher = teachersMap[session.teacherId];
                const teacherName = teacher?.displayName || teacher?.name || t('liveSessions.unknownTeacher') || 'Noma\'lum o\'qituvchi';
                
                // Vaqtni formatlash
                let startTimeText = '';
                if (session.startAt) {
                  try {
                    const startDate = session.startAt.toDate ? session.startAt.toDate() : new Date(session.startAt);
                    startTimeText = format(startDate, 'HH:mm');
                  } catch (e) {
                    console.error('Date format error:', e);
                  }
                }
                
                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <span className="live-badge" style={{ margin: 0 }}>
                            <span className="live-badge-dot" />
                          </span>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '1.1rem',
                            color: 'var(--text-primary)'
                          }}>
                            {session.summary || t('liveSessions.liveLesson')}
                          </div>
                        </div>
                        {session.description && (
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: 'var(--text-secondary)',
                            marginBottom: 12
                          }}>
                            {session.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-secondary)' }}>
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                            </svg>
                            <span style={{ fontWeight: 500 }}>{teacherName}</span>
                          </div>
                          {startTimeText && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-secondary)' }}>
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
                              </svg>
                              <span>{t('liveSessions.startedAt') || 'Boshlangan'}: {startTimeText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="live-badge">
                          <span className="live-badge-dot" />
                          {t('liveSessions.selected') || 'Tanlangan'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* O'qituvchi uchun: o'z efirlarini ko'rsatish */}
        {isTeacher && displaySessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{t('liveSessions.mySessions') || 'Mening efirlarim'}</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {displaySessions.map(session => {
                const sessionLink = getMeetLink(session);
                return (
                  <div
                    key={session.id}
                    className="live-session-active-card"
                    style={{ marginTop: 0 }}
                  >
                    <div className="live-session-status-row">
                      <span className="live-badge">
                        <span className="live-badge-dot" />
                        {t('liveSessions.activeBroadcast')}
                      </span>
                      <span className="live-status-text">
                        {session.summary || t('liveSessions.liveLesson')}
                      </span>
                      <div style={{ marginLeft: 'auto' }}>
                        <button
                          className="btn-stop-broadcast"
                          onClick={() => stopLive(session.id)}
                          disabled={liveLoading}
                          style={{ padding: '6px 16px', fontSize: '0.875rem' }}
                        >
                          {t('liveSessions.endBroadcast')}
                        </button>
                      </div>
                    </div>

                    {sessionLink && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 8, padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
                          <div style={{ marginBottom: 8 }}>
                            <strong>{t('liveSessions.meetLink')}:</strong>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <a
                              href={sessionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--primary)',
                                textDecoration: 'underline',
                                wordBreak: 'break-all',
                                fontSize: '0.875rem'
                              }}
                            >
                              {sessionLink}
                            </a>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                navigator.clipboard.writeText(sessionLink);
                                toast.success(t('liveSessions.linkCopied'));
                              }}
                              style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                            >
                              {t('liveSessions.copyLink')}
                            </button>
                          </div>
                        </div>

                        <a
                          href={sessionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-edit"
                          style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            borderRadius: 8,
                            width: '100%',
                            textAlign: 'center'
                          }}
                        >
                          {t('liveSessions.joinMeeting')}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tanlangan efirni ko'rsatish (talaba uchun) */}
        {!isTeacher && selectedSession && (
          <div className="live-session-active-card">
            <div className="live-session-status-row">
              <span className="live-badge">
                <span className="live-badge-dot" />
                {t('liveSessions.activeBroadcast')}
              </span>
              <span className="live-status-text">
                {selectedSession.summary || t('liveSessions.liveLesson')}
              </span>
            </div>

            <h3>{t('liveSessions.googleMeetReady') || 'Google Meet tayyor'}</h3>
            {meetLink && (
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>{t('liveSessions.meetLink')}:</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--primary)',
                      textDecoration: 'underline',
                      wordBreak: 'break-all'
                    }}
                  >
                    {meetLink}
                  </a>
                  <button
                    className="btn-edit"
                    onClick={() => {
                      navigator.clipboard.writeText(meetLink);
                      toast.success(t('liveSessions.linkCopied'));
                    }}
                    style={{ padding: '4px 12px', fontSize: '0.9rem' }}
                  >
                    {t('liveSessions.copyLink')}
                  </button>
                </div>
              </div>
            )}

            {meetLink ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 12,
                border: '2px solid var(--primary)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ marginBottom: 24 }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', color: 'var(--primary)' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor" />
                  </svg>
                </div>
                <h3 style={{ marginBottom: 12, color: 'var(--text-primary)', fontSize: '1.5rem' }}>
                  {t('liveSessions.googleMeetReady') || 'Google Meet tayyor'}
                </h3>

                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-edit"
                  style={{
                    display: 'inline-block',
                    padding: '16px 32px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    borderRadius: 8
                  }}
                >
                  {t('liveSessions.joinMeeting')}
                </a>
              </div>
            ) : null}
          </div>
        )}

        {/* Efir yo'q bo'lganda */}
        {displaySessions.length === 0 && (
          <div>
            <h3>{t('liveSessions.noBroadcast')}</h3>
            <p>{t('liveSessions.noBroadcastForGroup')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSessions;
