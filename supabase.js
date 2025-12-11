/**
 * Supabase Client for Cloudflare Workers
 * Handles all database operations for Interactive PDF Builder
 */

export class SupabaseClient {
  constructor(supabaseUrl, supabaseKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    };
  }

  /**
   * Test connection to Supabase
   */
  async testConnection() {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/pdf_projects?select=id&limit=1`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      return {
        connected: response.ok,
        status: response.status,
        error: response.ok ? null : await response.text(),
      };
    } catch (error) {
      return {
        connected: false,
        status: 0,
        error: error.message,
      };
    }
  }

  /**
   * Create new project (draft or published)
   */
  async createProject(projectData) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/pdf_projects`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create project: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Update existing project
   */
  async updateProject(projectId, projectData) {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/pdf_projects?id=eq.${projectId}`,
      {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(projectData),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update project: ${error}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Get project by ID
   */
  async getProject(projectId) {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/pdf_projects?id=eq.${projectId}&select=*`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get project: ${error}`);
    }

    const result = await response.json();
    if (!result || result.length === 0) {
      throw new Error('Project not found');
    }

    return result[0];
  }

  /**
   * List all projects with optional filtering
   */
  async listProjects(options = {}) {
    const {
      limit = 100,
      offset = 0,
      status = null,
      orderBy = 'updated_at',
      order = 'desc',
    } = options;

    let url = `${this.supabaseUrl}/rest/v1/pdf_projects?select=*&order=${orderBy}.${order}&limit=${limit}&offset=${offset}`;

    if (status) {
      url += `&status=eq.${status}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list projects: ${error}`);
    }

    return await response.json();
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/pdf_projects?id=eq.${projectId}`,
      {
        method: 'DELETE',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete project: ${error}`);
    }

    return true;
  }

  /**
   * Save project draft
   */
  async saveDraft(projectData) {
    return await this.createProject({
      ...projectData,
      status: 'draft',
    });
  }

  /**
   * Publish project
   */
  async publishProject(projectData) {
    return await this.createProject({
      ...projectData,
      status: 'published',
    });
  }

  /**
   * Get all drafts
   */
  async listDrafts(limit = 100) {
    return await this.listProjects({
      limit,
      status: 'draft',
    });
  }

  /**
   * Get all published projects
   */
  async listPublished(limit = 100) {
    return await this.listProjects({
      limit,
      status: 'published',
    });
  }
}

/**
 * Initialize Supabase client from environment
 */
export function initSupabase(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured in environment variables');
  }

  return new SupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Validate project data structure
 */
export function validateProjectData(data) {
  const errors = [];

  if (!data.title || data.title.trim() === '') {
    errors.push('Title is required');
  }

  if (data.total_pages && typeof data.total_pages !== 'number') {
    errors.push('total_pages must be a number');
  }

  if (data.status && !['draft', 'published', 'archived'].includes(data.status)) {
    errors.push('Invalid status. Must be: draft, published, or archived');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
