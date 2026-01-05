import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { liveService } from '../services/liveService';
import { groupService } from '../services/groupService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const LiveSessions = () => {
  const { currentUser, userData, isTeacher } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [liveSession, setLiveSession] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

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

  // Whenever selected group changes, load active session for that group
  useEffect(() => {
    const loadActive = async () => {
      if (!selectedGroupId) {
        setLiveSession(null);
        return;
      }
      setLiveLoading(true);
      const res = await liveService.getActiveSessionForGroup(selectedGroupId);
      if (res.success) setLiveSession(res.data || null);
      else setLiveSession(null);
      setLiveLoading(false);
    };

    loadActive();
  }, [selectedGroupId]);

  const startLive = async () => {
    const groupId = selectedGroupId;
    if (!groupId) return toast.error('Guruh tanlanmagan');

    setLiveLoading(true);
    try {
      const room = `group-${groupId}-${Date.now().toString(36)}`;
      const res = await liveService.createSession({ groupId, teacherId: currentUser.uid, provider: 'jitsi', room });
      if (res.success) {
        setLiveSession(res.data);
        toast.success('Jonli efir boshlandi');
      } else {
        toast.error('Jonli efirni boshlashda xatolik');
      }
    } catch (err) {
      console.error(err);
      toast.error('Xatolik yuz berdi');
    }
    setLiveLoading(false);
  };

  const stopLive = async () => {
    if (!liveSession?.id) return;
    setLiveLoading(true);
    const res = await liveService.endSession(liveSession.id);
    if (res.success) {
      setLiveSession(null);
      toast.info('Jonli efir yakunlandi');
    } else {
      toast.error('Jonli efirni to‘xtatishda xatolik');
    }
    setLiveLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="live-sessions-page">
      <div className="page-breadcrumb">{t('sidebar.liveLessons')}</div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
            <span>{groups.find(g => g.id === selectedGroupId)?.name || userData?.groupName || 'Belgilanmagan'}</span>
          )}

          {isTeacher && (
            <div style={{ marginLeft: 'auto' }}>
              {!liveSession ? (
                <button className="btn-edit" onClick={startLive} disabled={liveLoading || !selectedGroupId}>{t('liveSessions.startBroadcast')}</button>
              ) : (
                <button className="btn-cancel" onClick={stopLive} disabled={liveLoading}>{t('liveSessions.endBroadcast')}</button>
              )}
            </div>
          )}

        </div>

        {/* Embed or show status */}
        {liveSession ? (
          <div>
            <h3>{t('liveSessions.activeBroadcast')}</h3>
            <div style={{ marginBottom: 8 }}>{t('liveSessions.room')}: <strong>{liveSession.room}</strong></div>
            <iframe
              title="Jitsi Live"
              src={`https://meet.jit.si/${encodeURIComponent(liveSession.room)}#userInfo.displayName=${encodeURIComponent(JSON.stringify(userData?.displayName || (isTeacher ? 'Teacher' : 'Student')))}`}
              style={{ width: '100%', height: 480, border: 0 }}
              allow="camera; microphone; fullscreen; display-capture; screen-wake-lock; wake-lock; autoplay"
            />
          </div>
        ) : (
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
