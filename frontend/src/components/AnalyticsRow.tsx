import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, BarChart, Bar, Tooltip } from 'recharts'
import { useState, useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'
import { analyticsService, type Analytics } from '../services/api'

type AnalyticsRowProps = {
  activeTeam?: string | null
}

export const AnalyticsRow = ({ activeTeam }: AnalyticsRowProps) => {
  const { currentProject } = useProject()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await analyticsService.getProjectAnalytics(currentProject?._id, activeTeam)
      setAnalytics(response.data.analytics)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setAnalytics(null);
    } finally {
      setLoading(false)
    }
  }, [currentProject, activeTeam])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  const donutData = analytics ? [
    { name: 'To Do', value: analytics.statusBreakdown.todo, color: '#6366F1' },
    { name: 'In Progress', value: analytics.statusBreakdown.inProgress, color: '#EC4899' },
    { name: 'Done', value: analytics.statusBreakdown.done, color: '#A855F7' },
  ].filter(d => d.value > 0) : []

  // Fallback if no tasks
  const displayDonutData = donutData.length > 0 ? donutData : [{ name: 'No Data', value: 1, color: 'rgba(255,255,255,0.05)' }]

  const waveformData = Array.from({ length: 40 }).map((_, i) => ({
    x: i,
    y: i % 5 === 0 ? 40 : Math.random() * 80 + 10,
  }))

  // const projectTimeData = [
  //   { day: 'Sun', hours: 4 },
  //   { day: 'Mon', hours: 6 },
  //   { day: 'Tue', hours: 5 },
  //   { day: 'Wed', hours: 9 },
  //   { day: 'Thu', hours: 7 },
  // ]

  if (loading) {
    return (
      <div className="flex gap-4 h-[210px] items-center justify-center bg-white/[0.01] rounded-2xl border border-white/[0.03]">
        <div className="text-muted text-sm animate-pulse">Analyzing project metrics...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-[210px] shrink-0 mb-10 w-full min-w-0 overflow-x-auto">
      <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex overflow-hidden">
        <div className="flex flex-col justify-between w-[55%]">
          <div>
            <div className="text-[11px] text-muted mb-1">Status Overview</div>
            <div className="text-[17px] font-semibold mb-2">Task Status</div>
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-muted">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              <span>To Do: {analytics?.statusBreakdown.todo || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
              <span>In Progress: {analytics?.statusBreakdown.inProgress || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
              <span>Done: {analytics?.statusBreakdown.done || 0}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-end">
          <div className="w-[130px] h-[130px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={displayDonutData}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={60}
                  startAngle={220}
                  endAngle={-40}
                  strokeWidth={4}
                  stroke="rgba(15,23,42,0.8)"
                >
                  {displayDonutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] text-muted mb-1">Completion Rate</div>
            <div className="text-[17px] font-semibold">Overall Progress</div>
          </div>
          <div className="flex gap-5 text-[11px]">
            <div className="text-right">
              <div className="text-sm font-semibold">{analytics?.completionPercentage || 0}%</div>
              <div className="text-muted text-[10px]">Complete</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-red-400">{analytics?.overdueCount || 0}</div>
              <div className="text-muted text-[10px]">Overdue</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-yellow-400">{analytics?.blockedCount || 0}</div>
              <div className="text-muted text-[10px]">Blocked</div>
            </div>
          </div>
        </div>
        <div className="flex-1 relative">
          <ResponsiveContainer>
            <LineChart data={waveformData} margin={{ top: 10, bottom: 0, left: 0, right: 0 }}>
              <XAxis dataKey="x" hide />
              <Tooltip content={() => null} />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex justify-between px-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-full border-l border-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] text-muted mb-1">Priority Breakdown</div>
            <div className="text-[17px] font-semibold">Risk Distribution</div>
          </div>
        </div>
        <div className="flex-1 h-full">
          <ResponsiveContainer>
            <BarChart 
              data={[
                { name: 'High', count: analytics?.priorityBreakdown.high || 0 },
                { name: 'Med', count: analytics?.priorityBreakdown.medium || 0 },
                { name: 'Low', count: analytics?.priorityBreakdown.low || 0 },
              ]} 
              barCategoryGap={18}
            >
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1A1D2D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                itemStyle={{ color: '#fff' }}
              />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#A855F7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}


