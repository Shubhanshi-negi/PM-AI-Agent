import { TaskManager } from './TaskManager'
import { Inbox } from './Inbox'

type BottomRowProps = {
  searchQuery: string
  activeTeam?: string | null
}

export const BottomRow = ({ searchQuery, activeTeam }: BottomRowProps) => {
  return (
    <div className="flex gap-6 flex-1 min-h-0 w-full min-w-0 overflow-x-auto z-10 relative">
      <div className="w-2/3 min-w-[320px] max-w-[66%] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex flex-col hover:shadow-lg transition-all duration-200 ease-out overflow-hidden z-20 relative">
        <TaskManager searchQuery={searchQuery} activeTeam={activeTeam} />
      </div>
      <div className="flex-1 min-w-[240px] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex flex-col hover:shadow-lg transition-all duration-200 ease-out overflow-hidden z-20 relative">
        <Inbox searchQuery={searchQuery} activeTeam={activeTeam} />
      </div>
    </div>
  )
}


