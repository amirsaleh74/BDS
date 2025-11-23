/**
 * Smart Lead Assignment Engine
 * Automatically assigns leads to best-matched agent based on multiple factors
 */

class LeadAssignment {
    constructor(database) {
        this.db = database;
    }

    /**
     * Find best agent for a lead
     * @param {Object} lead - The lead to assign
     * @param {String} assignmentStrategy - 'best_match', 'round_robin', 'least_loaded'
     * @returns {Object} Assignment result with agent ID and reasoning
     */
    async assignLead(lead, assignmentStrategy = 'best_match') {
        const agents = this.getAvailableAgents();

        if (agents.length === 0) {
            return {
                success: false,
                error: 'No available agents'
            };
        }

        let selectedAgent;

        switch (assignmentStrategy) {
            case 'best_match':
                selectedAgent = this.findBestMatchAgent(lead, agents);
                break;
            case 'round_robin':
                selectedAgent = this.roundRobinAssignment(agents);
                break;
            case 'least_loaded':
                selectedAgent = this.leastLoadedAgent(agents);
                break;
            default:
                selectedAgent = this.findBestMatchAgent(lead, agents);
        }

        // Update lead with assignment
        const result = this.db.updateLead(lead.id, {
            assignedTo: selectedAgent.userId,
            assignedAt: new Date().toISOString(),
            assignmentReason: selectedAgent.reason
        });

        // Log activity
        this.db.addLeadActivity(lead.id, {
            type: 'lead_assigned',
            description: `Assigned to ${selectedAgent.username}`,
            metadata: {
                strategy: assignmentStrategy,
                reason: selectedAgent.reason,
                score: selectedAgent.matchScore
            },
            userId: null,
            username: 'system'
        });

        return {
            success: true,
            agent: selectedAgent,
            lead: result.lead
        };
    }

    /**
     * Get available agents (active users with agent or manager role)
     */
    getAvailableAgents() {
        const users = this.db.getAllUsers();
        return users.filter(u =>
            u.isActive &&
            (u.role === 'agent' || u.role === 'manager')
        );
    }

    /**
     * Find best match agent using scoring algorithm
     */
    findBestMatchAgent(lead, agents) {
        let bestMatch = null;
        let highestScore = -1;

        agents.forEach(agent => {
            const score = this.calculateAgentMatchScore(lead, agent);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = agent;
            }
        });

        return {
            userId: bestMatch.id,
            username: bestMatch.username,
            matchScore: highestScore,
            reason: this.getAssignmentReason(lead, bestMatch, highestScore)
        };
    }

    /**
     * Calculate how well an agent matches a lead (0-100 score)
     */
    calculateAgentMatchScore(lead, agent) {
        let score = 0;

        // 1. Workload factor (30 points max)
        const workloadScore = this.calculateWorkloadScore(agent);
        score += workloadScore;

        // 2. Skill level factor (25 points max)
        const skillScore = this.calculateSkillScore(lead, agent);
        score += skillScore;

        // 3. Performance factor (25 points max)
        const performanceScore = this.calculatePerformanceScore(agent);
        score += performanceScore;

        // 4. Specialization factor (20 points max)
        const specializationScore = this.calculateSpecializationScore(lead, agent);
        score += specializationScore;

        return Math.round(score);
    }

    /**
     * Workload Score: Less loaded agents get higher scores
     */
    calculateWorkloadScore(agent) {
        const allLeads = this.db.getAllLeads();
        const agentLeads = allLeads.filter(l =>
            l.assignedTo === agent.id &&
            l.status !== 'enrolled' &&
            l.status !== 'dead' &&
            l.status !== 'archived'
        );

        const activeCount = agentLeads.length;

        // Scoring: 0-5 leads = 30 pts, 6-10 = 20 pts, 11-15 = 10 pts, 16+ = 5 pts
        if (activeCount <= 5) return 30;
        if (activeCount <= 10) return 20;
        if (activeCount <= 15) return 10;
        return 5;
    }

    /**
     * Skill Score: Match lead complexity to agent skill
     */
    calculateSkillScore(lead, agent) {
        // Determine lead complexity
        const leadComplexity = this.getLeadComplexity(lead);

        // Get agent skill level from permissions or default
        const agentSkill = this.getAgentSkill(agent);

        // Perfect match = 25 pts
        // One level off = 15 pts
        // Two+ levels off = 5 pts

        const skillDiff = Math.abs(leadComplexity - agentSkill);

        if (skillDiff === 0) return 25;
        if (skillDiff === 1) return 15;
        return 5;
    }

    /**
     * Get lead complexity (1-5 scale)
     */
    getLeadComplexity(lead) {
        const debt = lead.totalDebt || 0;
        const qualScore = lead.qualificationScore || 50;

        // High debt + high qual score = complex (needs experienced closer)
        if (debt >= 75000 && qualScore >= 70) return 5; // Expert needed

        // High debt or high qual score = moderate-high
        if (debt >= 50000 || qualScore >= 65) return 4; // Senior agent

        // Medium debt and qual = moderate
        if (debt >= 25000 && qualScore >= 50) return 3; // Mid-level agent

        // Low debt or low qual = simple
        if (debt >= 10000 || qualScore >= 35) return 2; // Junior agent

        // Very small or unqualified = very simple (or disqualify)
        return 1; // Entry level or qualifier
    }

    /**
     * Get agent skill level from permissions or infer from role
     */
    getAgentSkill(agent) {
        // Check if skill level is set in permissions
        if (agent.permissions && agent.permissions.skillLevel) {
            return agent.permissions.skillLevel;
        }

        // Infer from role
        if (agent.role === 'admin') return 5;
        if (agent.role === 'manager') return 4;

        // Default for agents
        return 3;
    }

    /**
     * Performance Score: Better performers get better leads
     */
    calculatePerformanceScore(agent) {
        // Get agent's performance metrics
        const activities = this.db.loadData(this.db.leadActivitiesFile) || [];

        const agentActivities = activities.filter(a => a.userId === agent.id);

        // Count enrollments in last 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentEnrollments = agentActivities.filter(a =>
            a.type === 'lead_enrolled' &&
            new Date(a.timestamp).getTime() >= thirtyDaysAgo
        ).length;

        // Scoring based on recent performance
        if (recentEnrollments >= 10) return 25; // Top performer
        if (recentEnrollments >= 5) return 20;  // Good performer
        if (recentEnrollments >= 2) return 15;  // Average performer
        if (recentEnrollments >= 1) return 10;  // Below average
        return 5; // New or struggling agent
    }

    /**
     * Specialization Score: Match lead characteristics to agent strengths
     */
    calculateSpecializationScore(lead, agent) {
        let score = 0;

        // Check agent permissions for specializations
        const specializations = agent.permissions?.specializations || [];

        // Check state specialization
        if (lead.state && specializations.includes(lead.state)) {
            score += 10;
        }

        // Check debt type specialization
        if (lead.debtType && specializations.includes(lead.debtType)) {
            score += 5;
        }

        // Check source specialization
        if (lead.source && specializations.includes(lead.source)) {
            score += 5;
        }

        return Math.min(score, 20); // Cap at 20
    }

    /**
     * Round-robin assignment (simple rotation)
     */
    roundRobinAssignment(agents) {
        // Get last assignment timestamp for each agent
        const allLeads = this.db.getAllLeads();

        const agentLastAssignment = agents.map(agent => {
            const agentLeads = allLeads.filter(l => l.assignedTo === agent.id);
            const lastAssigned = agentLeads.length > 0 ? agentLeads[0].assignedAt : null;

            return {
                agent,
                lastAssigned: lastAssigned ? new Date(lastAssigned).getTime() : 0
            };
        });

        // Sort by oldest assignment first
        agentLastAssignment.sort((a, b) => a.lastAssigned - b.lastAssigned);

        const selectedAgent = agentLastAssignment[0].agent;

        return {
            userId: selectedAgent.id,
            username: selectedAgent.username,
            matchScore: 100,
            reason: 'Round-robin rotation'
        };
    }

    /**
     * Least loaded agent assignment
     */
    leastLoadedAgent(agents) {
        const allLeads = this.db.getAllLeads();

        const agentLoads = agents.map(agent => {
            const activeLeads = allLeads.filter(l =>
                l.assignedTo === agent.id &&
                l.status !== 'enrolled' &&
                l.status !== 'dead' &&
                l.status !== 'archived'
            ).length;

            return { agent, activeLeads };
        });

        // Sort by fewest active leads
        agentLoads.sort((a, b) => a.activeLeads - b.activeLeads);

        const selectedAgent = agentLoads[0].agent;

        return {
            userId: selectedAgent.id,
            username: selectedAgent.username,
            matchScore: 100,
            reason: `Least loaded (${agentLoads[0].activeLeads} active leads)`
        };
    }

    /**
     * Get human-readable assignment reason
     */
    getAssignmentReason(lead, agent, score) {
        const reasons = [];

        // Workload
        const activeLeads = this.db.getAllLeads().filter(l =>
            l.assignedTo === agent.id &&
            l.status !== 'enrolled' &&
            l.status !== 'dead'
        ).length;

        if (activeLeads <= 5) {
            reasons.push(`Low workload (${activeLeads} leads)`);
        }

        // Skill match
        const complexity = this.getLeadComplexity(lead);
        const skill = this.getAgentSkill(agent);

        if (complexity === skill) {
            reasons.push(`Perfect skill match`);
        }

        // Performance
        const activities = this.db.loadData(this.db.leadActivitiesFile) || [];
        const agentEnrollments = activities.filter(a =>
            a.userId === agent.id &&
            a.type === 'lead_enrolled'
        ).length;

        if (agentEnrollments >= 5) {
            reasons.push(`Strong performer (${agentEnrollments} enrollments)`);
        }

        // Default reason
        if (reasons.length === 0) {
            reasons.push(`Best overall match (score: ${score})`);
        }

        return reasons.join(', ');
    }

    /**
     * Bulk assign multiple leads
     */
    async bulkAssignLeads(leadIds, strategy = 'best_match') {
        const results = [];

        for (const leadId of leadIds) {
            const lead = this.db.getLead(leadId);
            if (!lead) continue;

            const result = await this.assignLead(lead, strategy);
            results.push(result);
        }

        return {
            success: true,
            assigned: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    /**
     * Reassign leads from one agent to another
     */
    reassignAgentLeads(fromAgentId, toAgentId, reason = 'Manual reassignment') {
        const leads = this.db.filterLeadsByAssignedUser(fromAgentId);
        const toAgent = this.db.getUserById(toAgentId);

        if (!toAgent) {
            return { success: false, error: 'Target agent not found' };
        }

        let reassigned = 0;

        leads.forEach(lead => {
            this.db.updateLead(lead.id, {
                assignedTo: toAgentId,
                reassignedAt: new Date().toISOString(),
                reassignmentReason: reason
            });

            this.db.addLeadActivity(lead.id, {
                type: 'lead_reassigned',
                description: `Reassigned to ${toAgent.username}`,
                metadata: { reason, fromAgentId, toAgentId },
                userId: null,
                username: 'system'
            });

            reassigned++;
        });

        return {
            success: true,
            reassigned: reassigned,
            toAgent: toAgent.username
        };
    }
}

module.exports = LeadAssignment;
