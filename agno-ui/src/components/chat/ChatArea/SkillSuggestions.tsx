import { useMemo } from 'react'

import { useStore } from '@/store'
import { truncateText } from '@/lib/utils'

const SkillSuggestions = () => {
    const recommendedSkills = useStore((state) => state.recommendedSkills)
    const isRoutingSkills = useStore((state) => state.isRoutingSkills)
    const skillsById = useStore((state) => state.skills)
    const isEndpointActive = useStore((state) => state.isEndpointActive)

    const resolvedSkills = useMemo(() => {
        if (recommendedSkills.length === 0) {
            return []
        }

        const catalogById = new Map(skillsById.map((skill) => [skill.id, skill]))

        return recommendedSkills.map((skill) =>
            catalogById.get(skill.id) ? catalogById.get(skill.id)! : skill
        )
    }, [recommendedSkills, skillsById])

    if (!isEndpointActive) {
        return null
    }

    if (!isRoutingSkills && resolvedSkills.length === 0) {
        return null
    }

    return (
        <div className="mb-2 rounded-xl border border-primary/20 bg-accent/30 p-3 text-xs text-muted">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase text-primary">
                <span>Suggested Skills</span>
                {isRoutingSkills && <span className="animate-pulse">routing…</span>}
            </div>
            {resolvedSkills.length === 0 ? (
                <p className="text-[11px] text-muted/80">
                    No skills matched the current draft. Keep typing to see suggestions.
                </p>
            ) : (
                <ul className="space-y-2">
                    {resolvedSkills.map((skill) => (
                        <li
                            key={skill.id}
                            className="rounded-lg border border-primary/10 bg-background/80 p-2"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-primary">{skill.name}</span>
                                {skill.version && (
                                    <span className="text-[10px] uppercase text-muted/70">
                                        v{skill.version}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted">
                                {truncateText(skill.description, 120)}
                            </p>
                            {skill.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {skill.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default SkillSuggestions
