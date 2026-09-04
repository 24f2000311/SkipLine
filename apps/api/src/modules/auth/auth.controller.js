import * as authService from "./auth.service.js";

export const authController = {
  /**
   * Register a new organizer user.
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;
      const result = await authService.registerOrganizer({
        name,
        email,
        password,
        phone,
      });

      res.status(201).json({
        success: true,
        message: "Organizer registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Login an existing organizer.
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.loginOrganizer({
        email,
        password,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Refresh JWT access token using a refresh token.
   * POST /api/v1/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully",
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Logout organizer by revoking refresh token.
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logoutOrganizer(refreshToken);

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get authenticated organizer's profile.
   * GET /api/v1/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getOrganizerProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
};
