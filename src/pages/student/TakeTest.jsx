import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { testService } from '../../services/testService';
import StudentTestTaker from '../../components/tests/StudentTestTaker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import './TakeTest.css';

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const result = await testService.getTestById(testId);
      if (result.success) {
        setTest(result.data);
      } else {
        toast.error('Testni yuklashda xatolik');
        navigate('/tests');
      }
    } catch (error) {
      console.error('Load test error:', error);
      toast.error('Testni yuklashda xatolik');
      navigate('/tests');
    }
    setLoading(false);
  };

  const handleTestComplete = () => {
    toast.success('Test muvaffaqiyatli yuborildi');
    navigate('/tests');
  };

  const handleCancel = () => {
    navigate('/tests');
  };

  if (loading) return <LoadingSpinner />;

  if (!test) {
    return (
      <div className="take-test-container">
        <p>Test topilmadi</p>
      </div>
    );
  }

  return (
    <div className="take-test-container">
      <StudentTestTaker
        test={test}
        onComplete={handleTestComplete}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default TakeTest;
