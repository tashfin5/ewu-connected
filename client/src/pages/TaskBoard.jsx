import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Plus, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TaskBoard = () => {
  const { groupId } = useParams();
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchTasks = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/tasks/${groupId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTasks(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchTasks(); }, [groupId, user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post('${API_URL}/api/tasks', {
        title, description, groupId
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      
      setShowModal(false);
      setTitle('');
      setDescription('');
      fetchTasks(); // Refresh list
    } catch (error) {
      alert("Error adding task");
    }
  };

  const getTasksByStatus = (status) => tasks.filter(task => task.status === status);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link to="/groups" className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft /></Link>
          <h1 className="text-2xl font-bold">Project Board</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 justify-center">
          <Plus /> Add Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {['To Do', 'Doing', 'Done'].map(status => (
          <div key={status} className="bg-gray-100 w-80 min-w-[300px] rounded-xl p-4 flex flex-col">
            <h3 className="font-bold mb-4">{status}</h3>
            <div className="space-y-3">
              {getTasksByStatus(status).map(task => (
                <div key={task._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="font-semibold">{task.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Task</h2>
              <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-4">
              <input type="text" placeholder="Task Title" className="w-full p-2 border rounded" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <textarea placeholder="Description" className="w-full p-2 border rounded" value={description} onChange={(e) => setDescription(e.target.value)} />
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Create Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;