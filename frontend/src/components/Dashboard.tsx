import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Search } from 'lucide-react'
import { AnalyticsRow } from './AnalyticsRow'
import { BottomRow } from './BottomRow'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

type DashboardContext = {
  activeTeam: string | null
}

export const Dashboard = () => {
  const { activeTeam } = useOutletContext<DashboardContext>()
  const { currentProject } = useProject()
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    if (!currentProject) {
      navigate('/projects')
    }
  }, [currentProject, navigate])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [currentSearchQuery, setCurrentSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentSearchQuery(searchQuery.trim())
  }

  return (
    <div className="flex w-full h-full min-h-0 max-h-full overflow-hidden">
      <div className="w-[240px] h-full border-r border-gray-200 dark:border-white/5 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 h-full flex flex-col px-8 py-7 gap-12 min-w-0 min-h-0 overflow-hidden">
        <Header pagePath={location.pathname} />
        <div className="mb-2">
          <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/4 border border-gray-200 dark:border-white/[0.06] text-[11px] text-gray-500 dark:text-muted flex-1 shadow-sm dark:shadow-none transition-all focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="w-3.5 h-3.5" />
              <input
                aria-label="Search tasks and messages"
                placeholder="Search tasks and team messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent w-full text-sm text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 dark:placeholder:text-muted"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="px-3 py-2 rounded-lg bg-primary text-[11px] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
            >
              Search
            </button>
          </form>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-12">
          <AnalyticsRow activeTeam={activeTeam} />
          <BottomRow searchQuery={currentSearchQuery} activeTeam={activeTeam} />
        </div>
      </div>
    </div>
  )
}
