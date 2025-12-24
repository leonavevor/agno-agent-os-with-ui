import { ChangeEvent, useCallback, useMemo } from 'react'

import { reloadSkillsAPI } from '@/api/os'
import { useStore } from '@/store'

const SkillCatalog = () => {
    const skills = useStore((state) => state.skills)
    const isSkillsLoading = useStore((state) => state.isSkillsLoading)
    const searchQuery = useStore((state) => state.skillSearchQuery)
    const setSearchQuery = useStore((state) => state.setSkillSearchQuery)
    const selectedEndpoint = useStore((state) => state.selectedEndpoint)
    const authToken = useStore((state) => state.authToken)
    const setSkills = useStore((state) => state.setSkills)
    const setIsSkillsLoading = useStore((state) => state.setIsSkillsLoading)
    const isEndpointActive = useStore((state) => state.isEndpointActive)

    const handleReload = useCallback(async () => {
        if (!selectedEndpoint) return
        setIsSkillsLoading(true)
        const reloaded = await reloadSkillsAPI(selectedEndpoint, authToken)
        setSkills(reloaded)
        setIsSkillsLoading(false)
    }, [authToken, selectedEndpoint, setIsSkillsLoading, setSkills])

    const showCatalog = isEndpointActive || skills.length > 0 || isSkillsLoading

    if (!showCatalog) {
        return null
    }

    const filteredSkills = useMemo(() => {
        if (!searchQuery.trim()) {
            return skills
        }

        const query = searchQuery.toLowerCase()
        return skills.filter((skill) => {
            return (
                skill.name.toLowerCase().includes(query) ||
                skill.description.toLowerCase().includes(query) ||
                skill.tags.some((tag) => tag.toLowerCase().includes(query)) ||
                skill.match_terms.some((term) => term.toLowerCase().includes(query))
            )
        })
    }, [skills, searchQuery])

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value)
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium uppercase text-primary">
                <span>Skills</span>
                <button
                    type="button"
                    onClick={handleReload}
                    className="text-[10px] font-medium uppercase text-primary hover:text-primary/80"
                >
                    Refresh
                </button>
            </div>
            <input
                type="search"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Search catalog"
                className="h-9 w-full rounded-xl border border-primary/15 bg-accent px-3 text-xs text-muted placeholder:text-muted/60 focus:border-primary focus:outline-none"
                aria-label="Search skills"
            />
            <div className="max-h-48 overflow-y-auto pr-1">
                {isSkillsLoading ? (
                    <ul className="space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <li
                                key={index}
                                className="h-12 animate-pulse rounded-lg border border-primary/10 bg-accent/30"
                            />
                        ))}
                    </ul>
                ) : filteredSkills.length === 0 ? (
                    <p className="text-[11px] text-muted/70">
                        {skills.length === 0
                            ? 'No skills available for this endpoint.'
                            : 'No skills match your search.'}
                    </p>
                ) : (
                    <ul className="space-y-2 text-[11px]">
                        {filteredSkills.map((skill) => (
                            <li
                                key={skill.id}
                                className="rounded-lg border border-primary/10 bg-accent/30 p-2"
                            >
                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-primary">
                                    <span>{skill.name}</span>
                                    {skill.version && (
                                        <span className="text-[10px] font-medium text-muted/70">
                                            v{skill.version}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-muted">
                                    {skill.description || 'No description provided.'}
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
        </div>
    )
}

export default SkillCatalog
