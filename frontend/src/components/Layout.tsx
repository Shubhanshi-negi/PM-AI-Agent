import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const Layout = () => {
  const location = useLocation()
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  
  return (
    <div className="flex w-full h-screen min-h-screen max-h-screen overflow-hidden">
      <div className="w-[240px] h-full border-r border-white/5 flex-shrink-0">
        <Sidebar activeTeam={activeTeam} onTeamChange={setActiveTeam} />
      </div>
      <div className="flex-1 h-full flex flex-col px-8 py-7 gap-6 min-w-0 overflow-hidden">
        <Header pagePath={location.pathname} />
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar-hide">
          <Outlet context={{ activeTeam }} />
        </div>
      </div>
    </div>
  )
}

