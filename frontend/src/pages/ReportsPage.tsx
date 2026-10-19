import { useState, useEffect, useCallback } from 'react'
import { useProject } from '../context/ProjectContext'
import { aiService, type AIInsights } from '../services/api'
import { AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react' // Ensure these are imported from lucide-react

export const ReportsPage = () => {
  const { currentProject } = useProject()
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchInsights = useCallback(async () => {
    if (!currentProject) {
      setInsights(null);
      return;
    }
    setLoading(true)
    try {
      const response = await aiService.getInsights(currentProject._id)
      setInsights(response.data)
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
      setInsights(null); // Clear insights on error
    } finally {
      setLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    void fetchInsights()
  }, [fetchInsights])

  if (!currentProject) {
    return <div className="p-8 text-center text-muted italic">Select a project to view AI reports.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Project Analysis: {currentProject.name}</h2>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Refresh Insights'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risks Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium uppercase tracking-wider text-xs">Identified Risks</h3>
          </div>
          <div className="grid gap-4">
            {loading ? (
              <div className="p-8 text-center text-muted italic">Analyzing risks...</div>
            ) : (insights?.deadlines?.overdue || []).length === 0 && (insights?.deadlines?.dueSoon || []).length === 0 && (insights?.deadlines?.onTrack || []).length === 0 && (insights?.suggestedActions || []).length === 0 ? (
              <div className="p-8 text-center text-muted italic border border-dashed border-white/10 rounded-2xl">
                No major risks detected. Project is on track!
              </div>
            ) : (
              <>
                {(insights?.deadlines?.overdue || []).map((item, idx) => (
                  <div key={idx} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">Overdue: {item.title}</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">High Severity</span>
                    </div>
                    <div className="text-sm text-muted leading-relaxed">This task is past its due date and needs immediate attention.</div>
                  </div>
                ))}
                {(insights?.deadlines?.dueSoon || []).map((item, idx) => (
                  <div key={idx} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">Due Soon: {item.title}</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">Medium Severity</span>
                    </div>
                    <div className="text-sm text-muted leading-relaxed">This task is due in the next 3 days.</div>
                  </div>
                ))}
                 {/* Display AI's computed riskLevel */}
                {insights?.riskLevel && insights.riskLevel !== 'Low' && (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">Overall Project Risk</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        insights.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {insights.riskLevel}
                      </span>
                    </div>
                    <div className="text-sm text-muted leading-relaxed">{insights.summary}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-medium uppercase tracking-wider text-xs">AI Recommendations</h3>
          </div>
          <div className="grid gap-4">
            {loading ? (
              <div className="p-8 text-center text-muted italic">Generating recommendations...</div>
            ) : (insights?.suggestedActions || []).length === 0 ? (
              <div className="p-8 text-center text-muted italic border border-dashed border-white/10 rounded-2xl">
                AI is still gathering data to provide recommendations.
              </div>
            ) : (
              (insights?.suggestedActions || []).map((rec, idx) => (
                <div key={idx} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-2">
                  <div className="font-semibold text-white">{rec.action}</div>
                  <div className="text-sm text-muted leading-relaxed">{rec.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

