/**
 * Researcher Agent
 * 
 * Gathers context and information for complex tasks.
 * Supports Recursive Long-Context (RLC) patterns for massive inputs.
 * 
 * Operating Rules:
 * - Probe and filter large contexts without full loading
 * - Recursive decomposition for massive inputs
 * - Aggregation patterns for coherent results
 * - READ-ONLY operations
 */

const { BaseAgent, AgentRole, AgentCapabilities } = require('./base-agent');
const { PythonBridge } = require('../python-bridge');
const fs = require('fs');
const path = require('path');

class ResearcherAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      role: AgentRole.RESEARCHER,
      name: options.name || 'researcher',
      description: 'Gathers context and information with RLC support',
      capabilities: [
        AgentCapabilities.SEARCH,
        AgentCapabilities.READ,
        AgentCapabilities.WEB_FETCH,
        AgentCapabilities.TODO,
        AgentCapabilities.HANDOFF
      ]
      // NOTE: No EDIT capability - Researcher is read-only
    });
    
    // RLC-specific configuration
    this.chunkSize = options.chunkSize || 4000; // tokens per chunk
    this.maxChunks = options.maxChunks || 10;
    this.researchResults = [];
    
    // Caching and credibility tracking
    this.researchCache = new Map();
    this.cacheMaxAge = options.cacheMaxAge || 3600000; // 1 hour
    this.sourceCredibility = new Map();

    // PythonBridge for genre intelligence (lazy init via shared singleton)
    this.pythonBridge = null;
  }

  getSystemPrompt() {
    return `You are the RESEARCHER agent in a multi-agent coding system.

# OPERATING CONTRACT (NON-NEGOTIABLE)
- **No guessing**: Ground all findings with sources.
- **Read-only**: Do not modify any files.
- **Efficiency**: Filter before full load; sample massive contexts.
- **Recursion limits**: Depth ≤3; chunk count ≤10.
- **Citations**: Always provide file paths, URLs, or line numbers.

# CAPABILITIES
You have access to the Recursive Long-Context (RLC) Skill:
- **Probe and Filter**: Sample large contexts efficiently
- **Decomposition**: Break massive inputs into chunks
- **Aggregation**: Merge findings coherently
- **Verification**: Validate intermediate results

# WORKFLOW
1. Receive research query from Supervisor
2. Probe: Sample the target context (first 1000 chars, etc.)
3. Filter: Use regex/keywords to identify relevant sections
4. Decompose: If >50K tokens, chunk and process recursively
5. Aggregate: Merge findings with deduplication
6. Report: Structured findings with citations

# OUTPUT FORMAT
Always structure your response as:
1. Query: [what was researched]
2. Sources: [files/URLs examined]
3. Findings: [key discoveries]
4. Evidence: [citations with file:line]
5. Gaps: [what couldn't be found]
6. Suggestions: [next research steps]`;
  }

  async process(task, context = {}) {
    this.log('info', 'Researcher processing query', { task: task.description || task });
    
    // Check recursion limits
    const limits = this.checkRecursionLimits();
    if (!limits.allowed) {
      return {
        success: false,
        error: limits.reason
      };
    }

    try {
      this.enterRecursion();
      
      const query = typeof task === 'string' ? task : task.description;
      
      // Step 1: Probe the context
      const probeResult = await this.probe(query, context);
      
      // Step 2: Determine if decomposition is needed
      if (probeResult.estimatedTokens > 50000) {
        // Use RLC decomposition
        const chunks = await this.decompose(probeResult);
        const chunkResults = await this.processChunks(chunks, query);
        const aggregated = await this.aggregate(chunkResults);
        
        this.exitRecursion();
        return aggregated;
      }
      
      // Step 3: Direct research for smaller contexts
      const findings = await this.research(query, probeResult);
      
      this.exitRecursion();
      return findings;
      
    } catch (error) {
      this.exitRecursion();
      return {
        success: false,
        error: error.message,
        partialResults: this.researchResults
      };
    }
  }

  // ===== RLC Core Functions =====

  async probe(query, context) {
    this.log('info', 'Probing context for query', { query });
    
    const sources = [];
    let estimatedTokens = 0;
    
    // Probe workspace files - always default to process.cwd()
    const cwd = context.workspace || context.cwd || process.cwd();
    const files = await this.findRelevantFiles(query, cwd);
      
    for (const file of files.slice(0, 20)) {
      const filePath = path.join(cwd, file);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const sample = fs.readFileSync(filePath, 'utf-8').slice(0, 1000);
        
        sources.push({
          type: 'file',
          path: file,
          size: stat.size,
          sample,
          relevant: this.isRelevant(sample, query)
        });
        
        estimatedTokens += Math.ceil(stat.size / 4); // ~4 chars per token
      }
    }
    
    // Probe URLs if provided
    if (context.urls) {
      for (const url of context.urls) {
        sources.push({
          type: 'url',
          url,
          sample: null, // Would fetch here
          relevant: true
        });
      }
    }
    
    return {
      query,
      sources,
      estimatedTokens,
      relevantSources: sources.filter(s => s.relevant)
    };
  }

  async findRelevantFiles(query, cwd) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.md', '.json', '.py'];
    const files = [];
    
    // Extract potential file patterns from query (min 3 chars for keywords)
    const keywords = query.toLowerCase().split(/\s+/)
      .filter(w => w.length >= 3);
    
    const walkDir = (dir, depth = 0) => {
      if (depth > 3) return; // Max depth
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(cwd, fullPath);
          
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            // Check if filename matches any keyword
            const nameMatch = keywords.some(k => 
              entry.name.toLowerCase().includes(k)
            );
            
            if (nameMatch || files.length < 50) {
              files.push(relativePath);
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };
    
    walkDir(cwd);
    
    return files;
  }

  isRelevant(content, query) {
    const keywords = query.toLowerCase().split(/\s+/)
      .filter(w => w.length >= 3);
    
    const contentLower = content.toLowerCase();
    return keywords.some(k => contentLower.includes(k));
  }

  async decompose(probeResult) {
    this.log('info', 'Decomposing large context into chunks');
    
    const chunks = [];
    const relevantSources = probeResult.relevantSources;
    
    // Group files into chunks
    let currentChunk = {
      id: `chunk-${chunks.length}`,
      sources: [],
      estimatedTokens: 0
    };
    
    for (const source of relevantSources) {
      const sourceTokens = source.type === 'file' 
        ? Math.ceil(source.size / 4)
        : 1000; // Estimate for URLs
      
      if (currentChunk.estimatedTokens + sourceTokens > this.chunkSize) {
        if (currentChunk.sources.length > 0) {
          chunks.push(currentChunk);
        }
        
        currentChunk = {
          id: `chunk-${chunks.length}`,
          sources: [],
          estimatedTokens: 0
        };
      }
      
      currentChunk.sources.push(source);
      currentChunk.estimatedTokens += sourceTokens;
      
      if (chunks.length >= this.maxChunks) {
        this.log('warn', `Reached max chunks (${this.maxChunks})`);
        break;
      }
    }
    
    if (currentChunk.sources.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  async processChunks(chunks, query) {
    const results = [];
    
    for (const chunk of chunks) {
      this.log('info', `Processing chunk ${chunk.id}`);
      
      // Read chunk contents
      const contents = [];
      for (const source of chunk.sources) {
        if (source.type === 'file') {
          const filePath = path.join(process.cwd(), source.path);
          if (fs.existsSync(filePath)) {
            contents.push({
              path: source.path,
              content: fs.readFileSync(filePath, 'utf-8')
            });
          }
        }
      }
      
      // Ask LLM to analyze this chunk
      const prompt = `Analyze these files for information about: ${query}

Files:
${contents.map(c => `--- ${c.path} ---\n${c.content.slice(0, 3000)}`).join('\n\n')}

Extract:
1. Key findings related to the query
2. Important code patterns or structures
3. Dependencies and relationships
4. Potential issues or concerns`;

      const response = await this.chat(prompt);
      
      results.push({
        chunkId: chunk.id,
        sources: chunk.sources.map(s => s.path),
        findings: response.text,
        timestamp: new Date().toISOString()
      });
    }
    
    return results;
  }

  async aggregate(chunkResults) {
    this.log('info', 'Aggregating chunk results');
    
    // Merge findings
    const allFindings = chunkResults.map(r => r.findings).join('\n\n---\n\n');
    const allSources = [...new Set(chunkResults.flatMap(r => r.sources))];
    
    // Ask LLM to synthesize
    const prompt = `Synthesize these research findings into a coherent report.

Findings from ${chunkResults.length} chunks:
${allFindings}

Provide:
1. Summary: Key discoveries (deduplicated)
2. Evidence: Citations with file paths
3. Patterns: Common themes
4. Gaps: What's missing
5. Recommendations: Next steps`;

    const response = await this.chat(prompt);
    
    const result = {
      success: true,
      query: chunkResults[0]?.query,
      sources: allSources,
      findings: response.text,
      chunksProcessed: chunkResults.length,
      synthesis: true,
      timestamp: new Date().toISOString()
    };
    
    this.researchResults.push(result);
    return result;
  }

  async research(query, probeResult) {
    const cacheKey = this.getCacheKey(query, probeResult);
    const cached = this.researchCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
      this.log('info', 'Returning cached research result');
      return {
        ...cached.result,
        fromCache: true,
        cacheAge: Date.now() - cached.timestamp
      };
    }
    
    this.log('info', 'Conducting direct research');
    
    // Read relevant files
    const contents = [];
    for (const source of probeResult.relevantSources) {
      if (source.type === 'file') {
        const filePath = path.join(process.cwd(), source.path);
        if (fs.existsSync(filePath)) {
          contents.push({
            path: source.path,
            content: fs.readFileSync(filePath, 'utf-8')
          });
        }
      }
    }
    
    // Ask LLM for research findings
    const prompt = `Research query: ${query}

Relevant files:
${contents.map(c => `--- ${c.path} ---\n${c.content.slice(0, 4000)}`).join('\n\n')}

Provide comprehensive findings with:
1. Direct answers to the query
2. Relevant code examples (with file:line citations)
3. Related concepts or patterns
4. Potential gaps in the codebase
5. Recommendations`;

    const response = await this.chat(prompt);
    
    const result = {
      success: true,
      query,
      sources: contents.map(c => c.path),
      findings: response.text,
      synthesis: false,
      timestamp: new Date().toISOString()
    };
    
    this.researchResults.push(result);
    
    // Cache the result
    this.researchCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      query,
      modelMetadata: this.modelMetadata
    });
    
    return result;
  }

  getCacheKey(query, probeResult) {
    const sources = probeResult.relevantSources.map(s => s.path || s.url).sort().join('|');
    return `${query}::${sources}`;
  }

  updateSourceCredibility(sourcePath, wasHelpful) {
    const current = this.sourceCredibility.get(sourcePath) || {
      helpful: 0,
      unhelpful: 0,
      lastAccessed: null
    };
    
    if (wasHelpful) {
      current.helpful++;
    } else {
      current.unhelpful++;
    }
    current.lastAccessed = new Date().toISOString();
    
    this.sourceCredibility.set(sourcePath, current);
  }

  clearCache() {
    this.researchCache.clear();
  }

  getCacheStats() {
    return {
      size: this.researchCache.size,
      maxAge: this.cacheMaxAge,
      entries: Array.from(this.researchCache.keys())
    };
  }

  // ===== Utility Methods =====

  async searchCodebase(pattern, options = {}) {
    const results = [];
    const cwd = options.cwd || process.cwd();
    
    const walkDir = (dir, depth = 0) => {
      if (depth > 4) return;
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (/\.(js|ts|jsx|tsx|md|json)$/.test(entry.name)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const regex = new RegExp(pattern, 'gi');
              const matches = content.match(regex);
              
              if (matches) {
                results.push({
                  file: path.relative(cwd, fullPath),
                  matchCount: matches.length,
                  sample: matches.slice(0, 3)
                });
              }
            } catch (e) {
              // Skip unreadable files
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };
    
    walkDir(cwd);
    
    return results.slice(0, 50);
  }

  reset() {
    super.reset();
    this.researchResults = [];
    this.researchCache.clear();
    this.sourceCredibility.clear();
  }

  // ===== Genre Intelligence Methods (Sprint 3 — Task 3.4) =====

  /**
   * Lazily initialise and start the shared PythonBridge.
   * @returns {Promise<PythonBridge>}
   */
  async ensurePythonBridge() {
    if (!this.pythonBridge) {
      this.pythonBridge = PythonBridge.getShared();
    }
    if (!this.pythonBridge.isRunning) {
      this.log('info', 'Starting PythonBridge for genre intelligence');
      await this.pythonBridge.start();
    }
    return this.pythonBridge;
  }

  /**
   * Look up the 10-dimensional DNA vector for a given genre.
   *
   * Results are cached in ``researchCache`` to avoid repeated RPCs.
   *
   * @param {string} genre  Genre identifier (e.g. "trap_soul").
   * @returns {Promise<object>}  { genre, found, vector, dimensions }
   */
  async queryGenreDNA(genre) {
    // Check cache first
    const cacheKey = `genre_dna::${genre}`;
    const cached = this.researchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheMaxAge) {
      this.log('info', 'Returning cached genre DNA', { genre });
      return { ...cached.result, fromCache: true };
    }

    await this.ensurePythonBridge();
    this.log('info', 'Querying genre DNA', { genre });

    const result = await this.pythonBridge.call('genre_dna_lookup', { genre });

    // Cache the result
    this.researchCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Blend multiple genre DNA vectors with weights.
   *
   * @param {Array<{genre: string, weight: number}>} genres
   * @returns {Promise<object>}  { vector, sources, description, suggested_tempo, dimensions }
   */
  async blendGenres(genres) {
    await this.ensurePythonBridge();
    this.log('info', 'Blending genres', { count: genres.length });

    const result = await this.pythonBridge.call('genre_blend', { genres });
    return result;
  }

  /**
   * Stop and release the PythonBridge.
   * @returns {Promise<void>}
   */
  async disposePythonBridge() {
    if (this.pythonBridge) {
      this.log('info', 'Disposing PythonBridge');
      await this.pythonBridge.stop();
      this.pythonBridge = null;
    }
  }
}

module.exports = { ResearcherAgent };
