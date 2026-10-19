import { Plus } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'
import { taskService, type Task } from '../services/api'
import { Modal } from './ui/Modal' // Assuming Modal.tsx is in components/ui
import { AddTaskForm } from './forms/AddTaskForm' // Assuming AddTaskForm.tsx is in components/forms
import EditTaskModal from './forms/EditTaskModal'

const columns = ['To Do', 'In Progress', 'Done']

type TaskManagerProps = {
  searchQuery?: string
  activeTeam?: string | null
}

export const TaskManager = ({ searchQuery = '', activeTeam }: TaskManagerProps) => {
  const { currentProject, taskRefreshTrigger } = useProject()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fetchTasks = useCallback(async () => {
    // if (!currentProject) {
    //   setTasks([]);
    //   return;
    // }
    setLoading(true)
    try {
      const response = await taskService.getByProject(currentProject?._id)
      
      let filteredTasks = response.data;

      // Apply search and team filters here
      if (activeTeam) {
        filteredTasks = filteredTasks.filter(task => task.team === activeTeam)
      }
      if (searchQuery) {
        filteredTasks = filteredTasks.filter(
          (task) =>
            task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase() || '')
        )
      }
      setTasks(filteredTasks)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setTasks([]);
    } finally {
      setLoading(false)
    }
  }, [currentProject, searchQuery, activeTeam])

  useEffect(() => {
    fetchTasks()
  }, [currentProject, searchQuery, activeTeam, taskRefreshTrigger, fetchTasks]) // Re-fetch when project, search, team, or refresh trigger changes

  const handleTaskAdded = () => {
    setIsModalOpen(false)
    fetchTasks() // Refresh tasks after adding one
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsEditModalOpen(true)
  }

  const handleTaskEdited = () => {
    setIsEditModalOpen(false)
    setSelectedTask(null)
    fetchTasks() // Refresh tasks after editing one
  }

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'Done': return 100
      case 'In Progress': return 50
      default: return 0
    }
  }

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status)

  return (
    <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <div className="text-[11px] text-muted mb-1">Task Manager</div>
          <div className="text-[17px] font-semibold">
            {currentProject ? `${currentProject.name} Tasks` : 'Task Manager'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-primary text-[11px] flex items-center gap-1 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed z-30 relative pointer-events-auto"
            tabIndex={0}
            style={{ position: 'relative' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => {
              if (tasks.length > 0) {
                setSelectedTask(tasks[0])
                setIsEditModalOpen(true)
              }
            }}
            disabled={tasks.length === 0}
            className="h-8 px-3 rounded-lg bg-white/5 text-[11px] flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed z-30 relative pointer-events-auto"
            tabIndex={0}
            style={{ position: 'relative' }}
          >
            <span>Edit Task</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm italic">
          Loading tasks...
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 grid grid-cols-3 gap-3 min-h-0 overflow-auto">
            {columns.map((statusColumn) => (
              <div key={statusColumn} className="space-y-3 min-h-0">
                <div className="text-[10px] uppercase tracking-wider text-muted mb-2 px-1">
                  {statusColumn} ({tasksByStatus(statusColumn).length})
                </div>
                {tasksByStatus(statusColumn).length === 0 && (
                  <div className="text-center text-muted text-xs italic">No tasks here</div>
                )}
                {tasksByStatus(statusColumn).map((task) => (
                  <TaskCard
                    key={task._id}
                    title={task.name}
                    subtitle={task.owner}
                    team={task.team}
                    description={task.description || 'No description provided.'}
                    time={new Date(task.dueDate).toLocaleDateString()}
                    progress={getStatusProgress(task.status)}
                    priority={task.priority}
                    onEdit={() => handleEditTask(task)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}




      {isModalOpen && (
        <div id="add-task-modal-root">
          <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title="Create New Task"
          >
            <AddTaskForm 
              onSuccess={handleTaskAdded} 
              onCancel={() => setIsModalOpen(false)} 
            />
          </Modal>
        </div>
      )}

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleTaskEdited}
        />
      )}
    </div>
  )
}

type TaskCardProps = {
  title: string
  subtitle: string
  team?: string
  description: string
  time: string
  progress: number
  priority: 'Low' | 'Medium' | 'High'
  onEdit: () => void
}

const TaskCard = ({ title, subtitle, team, description, time, progress, priority, onEdit }: TaskCardProps) => {
  const getPriorityColor = (p: 'Low' | 'Medium' | 'High') => {
    switch (p) {
      case 'High': return 'text-red-400'
      case 'Medium': return 'text-yellow-400'
      case 'Low': return 'text-green-400'
      default: return 'text-muted'
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 text-[11px] flex flex-col gap-1.5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer group">
      <div className="flex justify-between items-center text-[10px] text-muted">
        <span>{time}</span>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getPriorityColor(priority)}`}>{priority}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-primary/20 hover:bg-primary/40 text-xs text-primary transition-all duration-200"
          >
            Edit
          </button>
        </div>
      </div>
      <div className="text-[12px] font-semibold text-white truncate">{title}</div>
      <div className="flex justify-between items-center text-[10px] text-muted mb-1">
        <span>Owner: {subtitle}</span>
        {team && <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">{team}</span>}
      </div>
      <div className="text-[10px] text-muted line-clamp-2 leading-relaxed">{description}</div>
      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <div className="flex -space-x-1">
          <AvatarCircle />
        </div>
        <div className="flex items-center gap-3">
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  )
}

const AvatarCircle = () => (
  <div className="w-5 h-5 rounded-full border border-black/40 bg-[radial-gradient(circle_at_30%_20%,#FACC15,#F97316_40%,#A855F7_75%)]" />
)