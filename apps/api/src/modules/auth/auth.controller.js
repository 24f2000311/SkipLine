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

  /**
   * Verify email address with single-use token.
   * POST /api/v1/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      const result = await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  },


  /**
   * Resend verification email to unverified user.
   * POST /api/v1/auth/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendVerification(email);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Request password reset link.
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset password using reset token.
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword({ token, password });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Permanently delete organizer account and all owned data.
   * DELETE /api/v1/auth/account
   */
  async deleteAccount(req, res, next) {
    try {
      // Identity derived exclusively from req.user.id (never from body/query/params)
      const userId = req.user.id;
      const { password } = req.body || {};

      await authService.deleteAccount({
        userId,
        password,
        requestId: req.id,
      });

      res.status(200).json({
        success: true,
        message: "Account and all owned data permanently deleted.",
      });
    } catch (error) {
      next(error);
    }
  },
};
