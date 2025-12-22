import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { authService } from '../../services/authService';
import { 
  FiUsers, 
  FiSearch, 
  FiFilter, 
  FiCheck, 
  FiX, 
  FiTrash2,
  FiMoreVertical,
  FiMail,
  FiPhone
} from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/helpers';
import './Admin.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserName, setDeleteUserName] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Foydalanuvchilarni yuklashda xatolik');
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = users;

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved: true });
      toast.success('Foydalanuvchi tasdiqlandi');
      loadUsers();
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleReject = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved: false });
      toast.success('Foydalanuvchi rad etildi');
      loadUsers();
    } catch (error) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDelete = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setDeleteUserId(userId);
    setDeleteUserName(user.displayName);
    setConfirmAction(() => async () => {
      try {
        const result = await authService.deleteUser(userId, user.email);
        if (result.success) {
          toast.success(result.message || 'Foydalanuvchi o\'chirildi');
          loadUsers();
        } else {
          toast.error(result.error || 'Xatolik yuz berdi');
        }
      } catch (error) {
        console.error('Delete user error:', error);
        toast.error('Xatolik yuz berdi');
      }
    });
    setShowConfirmModal(true);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="role-badge admin">Administrator</span>;
      case 'teacher':
        return <span className="role-badge teacher">O'qituvchi</span>;
      default:
        return <span className="role-badge student">Talaba</span>;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Foydalanuvchilar</h1>
          <p>Barcha foydalanuvchilarni boshqarish</p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <FiUsers className="admin-stat-icon" />
          <div>
            <span className="admin-stat-value">{users.length}</span>
            <span className="admin-stat-label">Jami</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">
            {users.filter(u => u.role === 'student').length}
          </span>
          <span className="admin-stat-label">Talabalar</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-value">
            {users.filter(u => u.role === 'teacher').length}
          </span>
          <span className="admin-stat-label">O'qituvchilar</span>
        </div>
        <div className="admin-stat-card warning">
          <span className="admin-stat-value">
            {users.filter(u => !u.isApproved && u.role === 'teacher').length}
          </span>
          <span className="admin-stat-label">Tasdiq kutmoqda</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Qidiruv (ism, email)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <FiFilter />
          <select 
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Barcha rollar</option>
            <option value="student">Talabalar</option>
            <option value="teacher">O'qituvchilar</option>
            <option value="admin">Adminlar</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Status</th>
              <th>Ro'yxatdan o'tgan</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <img 
                      src={user.photoURL || '/default-avatar.png'} 
                      alt={user.displayName}
                      className="user-avatar-small"
                    />
                    <span className="user-name">{user.displayName}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  {user.isApproved ? (
                    <span className="status-badge approved">Tasdiqlangan</span>
                  ) : (
                    <span className="status-badge pending">Kutilmoqda</span>
                  )}
                </td>
                <td>{formatDate(user.createdAt, 'dd.MM.yyyy')}</td>
                <td>
                  <div className="action-buttons">
                    {!user.isApproved && user.role === 'teacher' && (
                      <>
                        <button 
                          className="action-btn success"
                          onClick={() => handleApprove(user.id)}
                          title="Tasdiqlash"
                        >
                          <FiCheck />
                        </button>
                        <button 
                          className="action-btn danger"
                          onClick={() => handleReject(user.id)}
                          title="Rad etish"
                        >
                          <FiX />
                        </button>
                      </>
                    )}
                    <button 
                      className="action-btn"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      title="Ko'rish"
                    >
                      <FiMoreVertical />
                    </button>
                    <button 
                      className="action-btn danger"
                      onClick={() => handleDelete(user.id)}
                      title="O'chirish"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Foydalanuvchi ma'lumotlari"
      >
        {selectedUser && (
          <div className="user-detail-modal">
            <div className="user-detail-header">
              <img 
                src={selectedUser.photoURL || '/default-avatar.png'} 
                alt={selectedUser.displayName}
                className="user-avatar-large"
              />
              <div>
                <h3>{selectedUser.displayName}</h3>
                {getRoleBadge(selectedUser.role)}
              </div>
            </div>

            <div className="user-detail-info">
              <div className="detail-item">
                <FiMail />
                <span>{selectedUser.email}</span>
              </div>
              {selectedUser.phoneNumber && (
                <div className="detail-item">
                  <FiPhone />
                  <span>{selectedUser.phoneNumber}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">Fakultet:</span>
                <span>{selectedUser.department || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Ro'yxatdan o'tgan:</span>
                <span>{formatDate(selectedUser.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Oxirgi faollik:</span>
                <span>{formatDate(selectedUser.lastActive)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
          setDeleteUserId(null);
          setDeleteUserName('');
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
        }}
        title="Tasdiqlash"
        message={`"${deleteUserName}" foydalanuvchisini o'chirmoqchimisiz?`}
        confirmText="Ha, o'chirish"
        cancelText="Bekor qilish"
        type="danger"
      />
    </div>
  );
};

export default Users;

