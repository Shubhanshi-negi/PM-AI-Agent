import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage, projectService } from '../../services/api';
import { useProject } from '../../context/ProjectContext';

interface CreateProjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateProjectForm = ({ onSuccess, onCancel }: CreateProjectFormProps) => {
  const { addProject } = useProject();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 week
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await projectService.create(formData);
      const created = response.data;
      // Set current project immediately
      addProject(created);
      onSuccess();
      // Close modal and navigate to dashboard
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Failed to create project:', error);
      setError(getApiErrorMessage(error, 'Failed to create project'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors";
  const labelClass = "block text-xs font-medium text-muted mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label className={labelClass}>Project Name</label>
        <input 
          type="text" 
          required
          className={inputClass}
          placeholder="e.g. Mobile App Launch"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
        />
      </div>

      <div>
        <label className={labelClass}>Description (Optional)</label>
        <textarea 
          className={inputClass}
          placeholder="Project description..."
          rows={2}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Date</label>
          <input 
            type="date" 
            required
            className={inputClass}
            value={formData.startDate}
            onChange={e => setFormData({...formData, startDate: e.target.value})}
          />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input 
            type="date" 
            required
            className={inputClass}
            value={formData.endDate}
            onChange={e => setFormData({...formData, endDate: e.target.value})}
          />
        </div>
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
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};