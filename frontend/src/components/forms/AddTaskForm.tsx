import { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { getApiErrorMessage, taskService, type Task, type TaskPriority, type TaskStatus, type TaskTeam } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../ui/BadgeComponents';

interface AddTaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddTaskForm = ({ onSuccess, onCancel }: AddTaskFormProps) => {
  const { currentProject, triggerTaskRefresh } = useProject();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    team: 'Development',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
    dependsOn: ''
  });

  // Fetch existing tasks for dependency dropdown
  useEffect(() => {
    const fetchTasks = async () => {
      if (currentProject) {
        try {
          const res = await taskService.getByProject(currentProject._id);
          setExistingTasks(res.data);
        } catch (err) {
          console.error("Failed to load tasks for dependencies", err);
        }
      }
    };
    fetchTasks();
  }, [currentProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!currentProject) return; 

    setLoading(true);
    setError(null);
    try {
      await taskService.create({
        ...formData,
        project: currentProject?._id,
        team: formData.team as TaskTeam,
        status: formData.status as TaskStatus,
        priority: formData.priority as TaskPriority,
        dependsOn: formData.dependsOn || null
      });
      triggerTaskRefresh(); // Trigger task refresh across the app
      onSuccess();
    } catch (err: unknown) {
      console.error('Failed to create task:', err);
      setError(getApiErrorMessage(err, 'Failed to create task. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors";
  const labelClass = "block text-xs font-medium text-muted mb-1.5";
  const optionClass = "bg-[#1A1D2D] text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}
      <div>
        <label className={labelClass}>Task Name</label>
        <input 
          type="text" 
          required
          className={inputClass}
          placeholder="e.g. Design Homepage"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Owner</label>
          <input 
            type="text" 
            required
            className={inputClass}
            placeholder="Name"
            value={formData.owner}
            onChange={e => setFormData({...formData, owner: e.target.value})}
          />
        </div>
        <div>
          <label className={labelClass}>Team</label>
          <select 
            className={inputClass}
            value={formData.team}
            onChange={e => setFormData({...formData, team: e.target.value})}
          >
            <option value="Development" className={optionClass}>Development</option>
            <option value="Marketing" className={optionClass}>Marketing</option>
            <option value="Design" className={optionClass}>Design</option>
            <option value="Product" className={optionClass}>Product</option>
            <option value="Operations" className={optionClass}>Operations</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Due Date</label>
          <input 
            type="date" 
            required
            className={inputClass}
            value={formData.dueDate}
            onChange={e => setFormData({...formData, dueDate: e.target.value})}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <select 
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer flex-1"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="To Do" className={optionClass}>To Do</option>
              <option value="In Progress" className={optionClass}>In Progress</option>
              <option value="Done" className={optionClass}>Done</option>
            </select>
            <StatusBadge status={formData.status as 'To Do' | 'In Progress' | 'Done'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Priority</label>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <select 
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer flex-1"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
            >
              <option value="Low" className={optionClass}>Low</option>
              <option value="Medium" className={optionClass}>Medium</option>
              <option value="High" className={optionClass}>High</option>
            </select>
            <PriorityBadge priority={formData.priority as 'Low' | 'Medium' | 'High'} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Dependency (Optional)</label>
          <select 
            className={inputClass}
            value={formData.dependsOn}
            onChange={e => setFormData({...formData, dependsOn: e.target.value})}
          >
            <option value="" className={optionClass}>No Dependency</option>
            {existingTasks.map(t => (
              <option key={t._id} value={t._id} className={optionClass}>{t.name} ({t.status})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea 
          className={inputClass}
          rows={3}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};