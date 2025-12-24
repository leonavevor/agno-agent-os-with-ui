/**
 * Reference Search Panel
 * Allows searching through skill references with keyword or vector search
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { searchReferences, getEmbeddingStatus, embedSkillReferences } from '@/api/advanced'
import type { SearchResult } from '@/api/advanced'
import type { SkillMetadata } from '@/types/os'
import { Search, Sparkles, Database } from 'lucide-react'

interface ReferenceSearchProps {
    endpoint: string
    skills: SkillMetadata[]
    authToken?: string
}

export const ReferenceSearch: React.FC<ReferenceSearchProps> = ({
    endpoint,
    skills,
    authToken
}) => {
    const [query, setQuery] = useState('')
    const [selectedSkill, setSelectedSkill] = useState<string>('all')
    const [useVector, setUseVector] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [searchType, setSearchType] = useState<'keyword' | 'vector'>('keyword')
    const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, boolean>>({})

    const handleSearch = async () => {
        if (!query.trim()) return

        setSearching(true)
        try {
            const response = await searchReferences(
                endpoint,
                query,
                selectedSkill === 'all' ? undefined : selectedSkill,
                5,
                useVector,
                authToken
            )

            setResults(response.results)
            setSearchType(response.search_type)
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setSearching(false)
        }
    }

    const handleEmbed = async (skillId: string) => {
        try {
            await embedSkillReferences(endpoint, skillId, 1000, authToken)
            // Update status
            setEmbeddingStatus(prev => ({ ...prev, [skillId]: true }))
        } catch (error) {
            console.error('Embedding failed:', error)
        }
    }

    const checkEmbeddingStatus = async (skillId: string) => {
        try {
            const status = await getEmbeddingStatus(endpoint, skillId, authToken)
            setEmbeddingStatus(prev => ({ ...prev, [skillId]: status.is_embedded }))
        } catch (error) {
            console.error('Status check failed:', error)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    <CardTitle>Reference Search</CardTitle>
                </div>
                <CardDescription>
                    Search through skill documentation and reference materials
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Controls */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="search-query">Search Query</Label>
                        <Input
                            id="search-query"
                            placeholder="e.g., How do I add tools to an agent?"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="skill-filter">Filter by Skill</Label>
                            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                                <SelectTrigger id="skill-filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Skills</SelectItem>
                                    {skills.map((skill) => (
                                        <SelectItem key={skill.id} value={skill.id}>
                                            {skill.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vector-toggle">Search Mode</Label>
                            <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                                <span className="text-sm text-muted-foreground">Keyword</span>
                                <Switch
                                    id="vector-toggle"
                                    checked={useVector}
                                    onCheckedChange={setUseVector}
                                />
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm font-medium">Vector</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={searching || !query.trim()}
                        className="w-full"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        {searching ? 'Searching...' : 'Search References'}
                    </Button>
                </div>

                {/* Results */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Results</Label>
                        {results.length > 0 && (
                            <Badge variant="outline">
                                {results.length} {searchType} matches
                            </Badge>
                        )}
                    </div>

                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {results.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No results yet. Enter a query and click search.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {results.map((result, idx) => (
                                    <div key={idx} className="space-y-2 pb-4 border-b last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Badge>{result.skill_id}</Badge>
                                            {result.similarity && (
                                                <Badge variant="secondary">
                                                    {(result.similarity * 100).toFixed(0)}% match
                                                </Badge>
                                            )}
                                        </div>
                                        {result.file_path && (
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {result.file_path}
                                            </p>
                                        )}
                                        <p className="text-sm">{result.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Vector Embedding Management */}
                {useVector && selectedSkill !== 'all' && (
                    <div className="space-y-2 pt-2 border-t">
                        <Label>Vector Embedding</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEmbed(selectedSkill)}
                            className="w-full"
                        >
                            <Database className="h-4 w-4 mr-2" />
                            Embed {skills.find(s => s.id === selectedSkill)?.name} References
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
