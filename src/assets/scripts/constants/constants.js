/**
 * Application configuration singleton.
 * Encapsulates all route and API status constants
 * with frozen (immutable) objects for safety.
 */
class AppConfig {
  /** @returns {Readonly<Record<string, string>>} */
  static get ROUTES() {
    return Object.freeze({
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      DASHBOARD: '/dashboard',
      PROFILE: '/profile',
      LOGOUT: '/logout',
      LEADERBOARD: '/leaderboard',
      ADMIN: '/admin',
      MANAGE_USERS: '/admin/users',
      MANAGE_TOURNAMENTS: '/admin/tournaments',
      HEALTH: '/api/health',
      PING: '/api/ping',
    })
  }

  /** @returns {Readonly<Record<string, string>>} */
  static get API_STATUS() {
    return Object.freeze({
      IDLE: 'idle',
      STARTING: 'starting',
      LOADING: 'loading',
      STOPPING: 'stopping',
      WORK: 'work',
      UPDATE: 'update',
      ERROR: 'error',
    })
  }

  /** @returns {Readonly<Record<string, string>>} */
  static get API_STATUS_MESSAGES() {
    const S = AppConfig.API_STATUS
    return Object.freeze({
      [S.IDLE]: 'API is idle',
      [S.STARTING]: 'Starting API...',
      [S.LOADING]: 'Loading data...',
      [S.STOPPING]: 'Stopping API...',
      [S.WORK]: 'API is working',
      [S.UPDATE]: 'Updating data...',
      [S.ERROR]: 'An error occurred',
    })
  }

  /**
   * Get status message by status key.
   * @param {string} status — one of API_STATUS values
   * @returns {string}
   */
  static getStatusMessage(status) {
    return AppConfig.API_STATUS_MESSAGES[status] ?? 'Unknown status'
  }
}

export const { ROUTES, API_STATUS, API_STATUS_MESSAGES } = AppConfig
export default AppConfig
