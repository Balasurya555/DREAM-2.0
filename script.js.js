// --- 1. Agent Configuration ---
let INITIAL_AGENTS = [
    { id: 'patent', name: "Patent Landscape Agent", icon: "📜", duration: 4000, outputKey: "patentRisk", statusText: "Checking FTO & Expiry...", tools: ["Govt Patent Office API", "Legal Document Parser (VLM)"] },
    { id: 'market', name: "IQVIA Insights Agent", icon: "📈", duration: 3500, outputKey: "marketScore", statusText: "Analyzing Market Size & Growth...", tools: ["Commercial Data Warehouse", "Competitor Website Scraper"] },
    { id: 'trials', name: "Clinical Trials Agent", icon: "🔬", duration: 3000, outputKey: "feasibility", statusText: "Verifying Trial Status...", tools: ["ClinicalTrials.gov API", "Internal Lab Data Query"] },
    { id: 'knowledge', name: "Internal Knowledge Agent", icon: "📚", duration: 2500, outputKey: "strategy", statusText: "Sourcing Internal Strategy...", tools: ["Company SharePoint RAG", "Previous Project Database"] },
    { id: 'report', name: "Report Generator Agent", icon: "📄", duration: 1500, outputKey: "finalReport", statusText: "Formatting Executive Summary...", tools: ["PDF/PPT Template Merger"] }
];

const IP_STRATEGY_AGENT = { id: 'ipstrategy', name: "IP Strategy Agent (RE-PLAN)", icon: "🛡️", duration: 3000, outputKey: "ipStrategy", statusText: "Generating Novel IP Strategy (Dosage Form)...", tools: ["Patent Attorney RAG", "Formulation Database Query"] };

// --- 2. Simulation Data & Constraints ---
const SIMULATION_RESULTS = {
    patentRisk: "HIGH RISK (Patent expires 2026, blocks initial formulation)",
    marketScore: "HIGH GROWTH (Oncology, CAGR 12% in Unmet Need Area)",
    feasibility: "Phase II Success (High Efficacy, Low Toxicity)",
    strategy: "Prioritize differentiated IP to capture high-value areas.",
    moleculeName: "Molecule X",
    indication: "Refractory Glioblastoma (Unmet Medical Need)",
    ipStrategy: "Novel sustained-release lipid formulation offers superior IP, extends life-cycle to 2045."
};

const INITIAL_CONSTRAINTS = [
    { id: 'c1', description: 'Repurpose approved molecule (Goal 1)', status: 'Pending' },
    { id: 'c2', description: 'Minimize patent risk (Constraint 1)', status: 'Pending' },
    { id: 'c3', description: 'Maximize market entry speed (Constraint 2)', status: 'Pending' },
    { id: 'c4', description: 'Target unmet medical needs (Goal 2)', status: 'Pending' }
];

const CONFIDENCE_SCORES = [
    { label: "Data Source Quality", score: 92 },
    { label: "Market Viability (Score)", score: 95 },
    { label: "FTO Risk Mitigation (Initial)", score: 78 },
    { label: "Cross-Agent Consensus", score: 88 }
];

const MANUAL_TIME_DAYS = 60; 
const DURATION_REPLAN = 2500; 
let currentAgents = [...INITIAL_AGENTS];
let roiInterval = null;

// --- 3. UI Helpers ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logToReasoningPanel = (text, type = 'log-data') => {
    const log = document.getElementById('reasoning-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `[${(new Date()).toLocaleTimeString()}] ${text}`;
    log.prepend(entry);
    document.getElementById('reasoning-panel').style.display = 'block';
};

const updateMasterStatus = (text) => {
    const masterStatus = document.getElementById('master-agent-status');
    if (masterStatus) masterStatus.innerHTML = `<span class="status-icon">🧠</span> **Master Agent (CSO) Status:** ${text}`;
};

function startROICounter() {
    const roiElement = document.getElementById('roi-counter');
    let currentDay = 0;
    
    const totalSimulationTime = currentAgents.reduce((sum, agent) => sum + agent.duration, 0) + DURATION_REPLAN + 3000;
    const increment = MANUAL_TIME_DAYS / (totalSimulationTime / 100); 

    roiInterval = setInterval(() => {
        currentDay += increment;
        if (currentDay >= MANUAL_TIME_DAYS) {
            currentDay = MANUAL_TIME_DAYS;
            clearInterval(roiInterval);
        }
        roiElement.innerText = `TIME SAVED: ${currentDay.toFixed(1)} Days`;
    }, 100);
}

function stopROICounter() {
    clearInterval(roiInterval);
    const roiElement = document.getElementById('roi-counter');
    if (roiElement) roiElement.innerText = `TIME SAVED: ${MANUAL_TIME_DAYS.toFixed(1)} Days (Goal Met!)`;
}


// --- 4. DOM Element Generation & Constraint Tracking ---
function renderAgentCards(agents) {
    const container = document.getElementById('agent-container');
    container.innerHTML = agents.map((agent) => `
        <div class="agent-card" id="agent-${agent.id}">
            <h4>${agent.icon} ${agent.name}</h4>
            <div class="progress-bar-container">
                <div class="progress-bar" id="progress-${agent.id}"></div>
            </div>
            <div class="agent-status" id="status-${agent.id}">Idle</div>
        </div>
    `).join('');
}

function renderConstraints(constraints) {
    const scorecard = document.getElementById('constraint-scorecard');
    if (!scorecard) return;
    scorecard.innerHTML = constraints.map(item => `
        <div class="constraint-item" id="constraint-${item.id}">
            <h5>${item.description}</h5>
            <div class="constraint-status status-${item.status.toLowerCase()}" id="status-${item.id}">
                ${item.status}
            </div>
        </div>
    `).join('');
}

function updateConstraint(id, status) {
    const statusElement = document.getElementById(`status-${id}`);
    if (statusElement) {
        statusElement.classList.remove('status-pending', 'status-fulfilled', 'status-mitigated');
        statusElement.classList.add(`status-${status.toLowerCase()}`);
        statusElement.innerText = status;
    }
}

function renderConfidenceChart(scores) {
    const chartContainer = document.getElementById('confidence-chart');
    if (!chartContainer) return;

    chartContainer.innerHTML = scores.map(item => `
        <div class="chart-bar-label">${item.label}</div>
        <div class="chart-bar-container">
            <div class="chart-bar" style="width: 0%;" data-confidence="${item.score}" id="chart-bar-${item.label.replace(/\s/g, '-')}">
                ${item.score}%
            </div>
        </div>
    `).join('');

    setTimeout(() => {
        scores.forEach(item => {
            const bar = document.getElementById(`chart-bar-${item.label.replace(/\s/g, '-')}`);
            if (bar) bar.style.width = `${item.score}%`;
        });
    }, 100);
}


// --- 5. Core Agentic Logic (Simulation of Parallel Execution) ---
async function runAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    const progressBar = document.getElementById(`progress-${agent.id}`);
    const statusText = document.getElementById(`status-${agent.id}`);

    if (!card) {
        console.error(`Agent card for ${agent.id} not found.`);
        return { id: agent.id, result: "ERROR" };
    }
    
    if (agent.id === 'report') return { id: 'report', result: 'Ready for Synthesis' }; 

    card.classList.remove('complete', 'replan');
    card.classList.add('running');
    progressBar.style.width = '0%';
    statusText.innerText = `Initializing... ${agent.statusText}`;

    const steps = 6; 
    for (let i = 1; i <= steps; i++) {
        await delay(agent.duration / steps);
        progressBar.style.width = `${(i / steps) * 100}%`;
        
        if (i === 2) {
            statusText.innerText = `Tool Call Success: ${agent.tools[0]} ✅`;
            logToReasoningPanel(`${agent.name}: Invoked ${agent.tools[0]}`, 'log-data');
        } else if (i === 4) {
            statusText.innerText = `Processing data with LLM...`;
        }
        
        if (agent.id === 'patent' && i === 5) {
             statusText.innerHTML = `<span class="log-alert">DATA ACQUIRED: CRITICAL FTO ALERT!</span>`;
        } else if (i < 2) {
            statusText.innerText = `${agent.statusText} (${Math.floor((i / steps) * 100)}%)`;
        }
    }
    
    card.classList.remove('running');
    card.classList.add('complete');
    card.style.borderColor = '#4CAF50';
    statusText.innerHTML = `✅ COMPLETE: <span style="font-weight:700;">Results Delivered</span>`;
    
    logToReasoningPanel(`${agent.name} delivered key finding.`, 'log-data');
    
    return {
        id: agent.id,
        result: SIMULATION_RESULTS[agent.outputKey] 
    };
}

// --- Sequential run for the Report Generator ---
async function runReportAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    const progressBar = document.getElementById(`progress-${agent.id}`);
    const statusText = document.getElementById(`status-${agent.id}`);
    
    if (!card) return;
    
    card.classList.remove('complete');
    card.classList.add('running');
    progressBar.style.width = '0%';
    
    logToReasoningPanel(`Master Agent delegating final data and structure to **${agent.name}**...`, 'log-master');
    
    await delay(300);
    statusText.innerText = `Synthesizing charts and tables...`;
    progressBar.style.width = '33%';
    
    await delay(500);
    statusText.innerText = `Formatting as polished PDF/PPT output...`;
    progressBar.style.width = '66%';
    
    await delay(700);
    progressBar.style.width = '100%';
    
    card.classList.remove('running');
    card.classList.add('complete');
    card.style.borderColor = '#00FFFF'; // Cyan border for final output
    statusText.innerHTML = `✅ COMPLETE: **Final Report Ready**`;
    logToReasoningPanel(`**${agent.name}** delivered the final executive report structure.`, 'log-data');
}


// --- 6. The Master Agent's Synthesis, Re-planning, and Final Report ---
async function synthesizeResults(initialResults) {
    const reportContent = document.getElementById('report-content');
    const masterAgentBox = document.getElementById('master-agent-status');

    updateMasterStatus('Performing **Deep Synthesis** and Cross-Validation...');
    logToReasoningPanel('Initial Data Acquired. Cross-validating findings and constraints...', 'log-master');
    
    // Judge-focused check: Strategic alignment
    logToReasoningPanel('Master Agent validating alignment with strategic goal: **Moving beyond low-margin generics**...', 'log-master');
    await delay(1500);

    const patentResult = initialResults.find(r => r.id === 'patent').result;
    const marketResult = initialResults.find(r => r.id === 'market').result;
    
    let finalRecommendation = '';
    let finalScores = [...CONFIDENCE_SCORES];

    // Constraint Updates
    updateConstraint('c1', 'Fulfilled'); await delay(200);
    updateConstraint('c4', 'Fulfilled'); await delay(500);

    if (patentResult.includes('HIGH RISK') && marketResult.includes('HIGH GROWTH')) {
        // --- CRITICAL FAILURE DETECTION & AUTONOMOUS RE-PLANNING ---
        logToReasoningPanel(`CRITICAL CONFLICT DETECTED: ${patentResult} vs ${marketResult}. Constraint C2 (Minimize Patent Risk) FAILED.`, 'log-alert');
        updateConstraint('c2', 'Pending'); 
        
        // --- COOLER EFFECT: Glitch during critical reasoning ---
        masterAgentBox.classList.add('glitch-active');
        logToReasoningPanel('Master Agent initiating **Autonomous Re-planning** by deploying IP Strategy Agent...', 'log-master');
        
        await delay(DURATION_REPLAN); 
        masterAgentBox.classList.remove('glitch-active');
        
        // Dynamic deployment and execution
        currentAgents.push(IP_STRATEGY_AGENT);
        renderAgentCards(currentAgents);
        const newCard = document.getElementById(`agent-${IP_STRATEGY_AGENT.id}`);
        newCard.classList.add('replan');

        logToReasoningPanel(`RE-PLAN DEPLOYED: Launching ${IP_STRATEGY_AGENT.name} to resolve the FTO conflict.`, 'log-replan');

        await runAgent(IP_STRATEGY_AGENT); 
        newCard.classList.remove('replan');
        newCard.classList.add('complete');
        
        // Constraint Mitigation/Fulfillment
        updateConstraint('c2', 'Mitigated'); await delay(300);
        updateConstraint('c3', 'Fulfilled'); 
        
        // Update Confidence Score
        finalScores = finalScores.map(s => s.label.includes('FTO Risk') ? { ...s, score: 90 } : s);
        
        finalRecommendation = `The Master Agent successfully **mitigated the critical FTO conflict** by autonomously deploying the IP Strategy Agent. **Recommended Action:** Develop a <span class="highlight">${SIMULATION_RESULTS.ipStrategy}</span> to secure new IP (new patent) and proceed, thereby fulfilling the 'Minimize Patent Risk' constraint. This provides a **differentiated, high-margin, value-added product**, meeting the company's core strategic goal.`;
    } else {
        // No conflict - simple fulfillment
        updateConstraint('c2', 'Fulfilled');
        updateConstraint('c3', 'Fulfilled');
        finalRecommendation = `No major conflicts detected. Proceed with standard development for ${SIMULATION_RESULTS.moleculeName}, capitalizing on the ${marketResult}.`;
    }

    // 2. Final Report Generation (Sequential Agent Invocation)
    await runReportAgent(currentAgents.find(a => a.id === 'report'));

    updateMasterStatus('Synthesis Complete. **Innovative Product Story** Generated.');
    stopROICounter(); 
    await delay(500);

    const reportStatus = document.getElementById('report-status');
    reportStatus.innerHTML = '<span class="status-icon">🎯</span> **FINAL STRATEGY DELIVERED**';

    reportContent.innerHTML = `
        <p><strong>Proposed Product:</strong> <span class="highlight">${SIMULATION_RESULTS.moleculeName} for ${SIMULATION_RESULTS.indication}</span></p>
        <p><strong>Strategic Alignment:</strong> **Meets the mandate to transition from Generics to Value-Added Innovation.**</p>
        <p><strong>Market Opportunity:</strong> ${marketResult}</p>
        <p><strong>Clinical Feasibility:</strong> ${SIMULATION_RESULTS.feasibility}</p>
        
        <div class="recommendation">
            <p><strong>Executive Summary & Recommended Action:</strong></p>
            <p>${finalRecommendation}</p>
        </div>
        <p style="margin-top: 20px; font-size:0.9em; color:#FFEB3B;">**Quantifiable ROI:** Strategic decision reached in **<15 seconds**, saving the equivalent of **${MANUAL_TIME_DAYS} days** of senior scientific research.</p>
    `;

    renderConfidenceChart(finalScores);
    document.getElementById('output-area').style.display = 'block';
}


// --- 7. Main Execution Flow ---
async function startDREAM() {
    const runButton = document.getElementById('run-button');
    runButton.disabled = true;
    runButton.innerText = "Processing Agents... (2 Months → Seconds)";
    
    document.getElementById('output-area').style.display = 'none';
    document.getElementById('reasoning-log').innerHTML = '';
    document.getElementById('reasoning-panel').style.display = 'block';
    
    currentAgents = [...INITIAL_AGENTS];
    const researchAgents = currentAgents.filter(a => a.id !== 'report'); 
    const resetConstraints = INITIAL_CONSTRAINTS.map(c => ({...c, status: 'Pending'}));

    renderAgentCards(currentAgents); 
    renderConstraints(resetConstraints);
    startROICounter();

    updateMasterStatus('Orchestrating **Parallel Discovery**...');
    logToReasoningPanel('Master Agent initiating parallel research from core query...', 'log-master');

    // 1. Execute initial research tasks (in parallel)
    const initialAgentPromises = researchAgents.map((agent) => runAgent(agent));
    const initialResults = await Promise.all(initialAgentPromises); 

    // 2. Synthesis, Re-planning, and Final Report
    await synthesizeResults(initialResults);

    runButton.disabled = false;
    runButton.innerText = "🚀 Initiate Generative Synthesis (Re-run)";
}
// --- 9. PDF Export Functionality (New Feature) ---
function exportReportToPDF() {
    const element = document.getElementById('pdf-target');
    
    // Configuration for the PDF generation (ensures multi-page support)
    const options = {
        margin: [10, 10, 10, 10], // top, left, bottom, right in mm
        filename: `DREAM_Strategy_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Use html2pdf to generate and save the file
    html2pdf().set(options).from(element).save();
}
// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup state
    renderAgentCards(INITIAL_AGENTS);
    renderConstraints(INITIAL_CONSTRAINTS);
    document.getElementById('reasoning-panel').style.display = 'none';
    document.getElementById('output-area').style.display = 'none';
    const roiElement = document.getElementById('roi-counter');
    if (roiElement) roiElement.innerText = `TIME SAVED: ${MANUAL_TIME_DAYS.toFixed(1)} Days Potential`;
});