import { Router, Request, Response } from 'express';
import { DiscordOAuthService } from '../services/discord-oauth.js';
import cvnlApiService from '../services/api.js';
import dbService from "../services/database.js";

const router = Router();
const discordOAuth = new DiscordOAuthService();

// Exchange authorization code for access token
router.post('/oauth/token', async (req: Request, res: Response) => {
  try {
    if (!discordOAuth.isOAuthConfigured()) {
      return res.status(503).json({ 
        error: 'Discord OAuth not configured on server. Please contact administrator.' 
      });
    }

    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokenData = await discordOAuth.exchangeCodeForToken(code, redirect_uri);
    const userInfo = await discordOAuth.getUserInfo(tokenData.access_token);
    
    dbService.saveOAuthSession({
      discordId: userInfo.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
    });

    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user: {
        id: userInfo.id,
        username: userInfo.username,
        discriminator: userInfo.discriminator,
        avatar: userInfo.avatar,
      }
    });

  } catch (error: any) {
    console.error('Discord OAuth token exchange error:', error);
    res.status(400).json({ error: error.message || 'OAuth token exchange failed' });
  }
});

// Verify access token
router.post('/oauth/verify', async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const isValid = await discordOAuth.verifyToken(access_token);
    
    if (isValid) {
      const userInfo = await discordOAuth.getUserInfo(access_token);
      res.json({
        valid: true,
        user: {
          id: userInfo.id,
          username: userInfo.username,
          discriminator: userInfo.discriminator,
          avatar: userInfo.avatar,
        }
      });
    } else {
      res.json({ valid: false });
    }

  } catch (error: any) {
    console.error('Discord OAuth verify error:', error);
    res.status(400).json({ error: error.message || 'Token verification failed' });
  }
});

// Refresh access token
router.post('/oauth/refresh', async (req: Request, res: Response) => {
  try {
    if (!discordOAuth.isOAuthConfigured()) {
      return res.status(503).json({ 
        error: 'Discord OAuth not configured on server. Please contact administrator.' 
      });
    }

    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokenData = await discordOAuth.refreshToken(refresh_token);
    
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });

  } catch (error: any) {
    console.error('Discord OAuth refresh error:', error);
    res.status(400).json({ error: error.message || 'Token refresh failed' });
  }
});

// Get all tokens for a Discord user
router.get('/tokens/:discordUserId', async (req: Request, res: Response) => {
  try {
    const { discordUserId } = req.params;
    if (!discordUserId) {
      return res.status(400).json({ error: 'Discord user ID is required' });
    }
    const oauthSession = await dbService.getOAuthSession(discordUserId);

    if (!oauthSession) {
      return res.status(404).json({ error: 'Discord user not found or not authenticated' });
    }
    

    // Get all tokens for this admin user
    const userTokens = await dbService.getAllUsers();

    const tokensResponse = userTokens.map((user: any) => ({
      id: user.cvnlUserId,
      token: user.token,
      userName: user.cvnlUserName,
      userId: user.cvnlUserId,
      addedAt: user.createdAt,
      status: 'disconnected', // TODO: Check real connection status
      userInfo: {
        gender: user.cvnlUserGender,
        job: user.cvnlUserJob,
        age: user.cvnlUserAge
      }
    }));

    res.json({ tokens: tokensResponse });

  } catch (error: any) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tokens' });
  }
});

// Add/Save a new token for Discord user
router.post('/tokens', async (req: Request, res: Response) => {
  try {
    const { discordUserId, token } = req.body;

    if (!discordUserId || !token) {
      return res.status(400).json({ error: 'Thiếu thông tin Discord ID hoặc token' });
    }

    // Verify token with CVNL API
    const userInfo = await cvnlApiService.authenticateUser(token);
    
    if (!userInfo) {
      return res.status(400).json({ error: 'Token CVNL không hợp lệ hoặc đã hết hạn' });
    }

    const existingUser = await dbService.getUser(discordUserId, userInfo.id);
    if (!existingUser) {
      console.log(`User chưa có trong hệ thống => Tạo mới...`);
    }

    // Check if THIS SPECIFIC CVNL user has a Discord channel
    let channelInfo = null;
    let shouldCreateChannel = false;
    let channelCreated = false;

    try {
      // Check for channel specific to this CVNL user (this will auto-cleanup if channel is deleted)
      const channelService = req.app.locals.bot.getChannelService();
      let existingChannel = null;
      
      if (channelService) {
        existingChannel = await channelService.getUserChannel(discordUserId, userInfo.id);
      }
      
      console.log('Existing channel for CVNL user:', userInfo.id, existingChannel ? existingChannel.name : 'None');
      
      if (!existingChannel) {
        shouldCreateChannel = true;
        console.log('No valid channel found for this CVNL user, will create new one');
      } else {
        console.log(`Valid channel found for CVNL user ${userInfo.id}: ${existingChannel.name}`);
        channelInfo = {
          channelId: existingChannel.id,
          channelName: existingChannel.name,
          guildId: existingChannel.guildId
        };
      }
    } catch (channelCheckError) {
      console.error('Error checking existing channel:', channelCheckError);
      shouldCreateChannel = true;
    }

    console.log('Channel check result:', { shouldCreateChannel, existingChannelInfo: channelInfo });

    // Create channel if needed (regardless of whether token exists or not)
    if (shouldCreateChannel) {
      try {
        // Get bot client and channel service from app locals
        const channelService = req.app.locals.bot.getChannelService();
        
        if (req.app.locals.bot && channelService) {
          const client = req.app.locals.bot.getClient();
          const guild = client.guilds.cache.first(); // Get first guild the bot is in
          
          if (guild) {
            console.log(`Creating new channel for user: ${userInfo.name} (${userInfo.id})`);
            
            const channel = await channelService.createUserChannel(
              guild,
              discordUserId,
              userInfo.name,
              userInfo.id
            );
            
            if (channel) {
              channelInfo = {
                channelId: channel.id,
                channelName: channel.name,
                guildId: guild.id
              };
              channelCreated = true;
              console.log(`Created Discord channel for user ${userInfo.name}: ${channel.name}`);
            }
          } else {
            console.error('No guild found for bot to create channel');
          }
        }
      } catch (channelError) {
        console.error('Failed to create Discord channel:', channelError);
        // Don't fail the entire request if channel creation fails
      }
    }

    // Handle existing token case AFTER checking/creating channel
    if (existingUser) {
      if (channelCreated) {
        // Token exists but channel was created
        console.log('Token exists, channel was created, returning success');
        const response = {
          success: true,
          tokenData: {
            id: userInfo.id,
            token: token,
            userName: userInfo.name,
            userId: userInfo.id,
            addedAt: existingUser.createdAt,
            status: 'connected',
            userInfo: {
              gender: userInfo.gender,
              job: userInfo.job,
              age: userInfo.age
            },
            message: `Tài khoản CVNL "${userInfo.name}" đã tồn tại, đã tạo Discord channel`,
            channelInfo: channelInfo
          }
        };
        console.log('Sending success response for existing user with new channel:', JSON.stringify(response, null, 2));
        return res.json(response);
      } else {
        // Token exists and channel already exists or failed to create
        console.log('Token already exists and channel exists, returning error');
        const errorResponse = { 
          error: `Tài khoản CVNL "${userInfo.name}" đã được thêm trước đó` 
        };
        console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
        return res.status(400).json(errorResponse);
      }
    }

    // If we reach here, it means this is a NEW token
    console.log('This is a new token, proceeding to save...');

    // Save new token to database
    try {
      await dbService.saveUser({
        discordId: discordUserId,
        token: token,
        cvnlUserId: userInfo.id,
        cvnlUserName: userInfo.name,
        cvnlUserGender: userInfo.gender,
        cvnlUserJob: userInfo.job,
        cvnlUserAge: userInfo.age,
      });

      const response = {
        success: true,
        tokenData: {
          id: userInfo.id,
          token: token,
          userName: userInfo.name,
          userId: userInfo.id,
          addedAt: new Date().toISOString(),
          status: 'connected',
          userInfo: {
            gender: userInfo.gender,
            job: userInfo.job,
            age: userInfo.age
          },
          message: channelCreated ? 'Thêm token thành công và đã tạo Discord channel' : 'Thêm token thành công',
          channelInfo: channelInfo
        }
      };
      console.log('Sending success response for new token:', JSON.stringify(response, null, 2));
      return res.json(response);

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      if (dbError.message.includes('UNIQUE constraint') || dbError.message.includes('already added')) {
        const errorResponse = { 
          error: `Tài khoản CVNL "${userInfo.name}" đã được thêm trước đó` 
        };
        console.log('Sending duplicate error response:', JSON.stringify(errorResponse, null, 2));
        return res.status(400).json(errorResponse);
      }
      
      const errorResponse = { 
        error: 'Có lỗi xảy ra khi lưu thông tin tài khoản' 
      };
      console.log('Sending database error response:', JSON.stringify(errorResponse, null, 2));
      return res.status(500).json(errorResponse);
    }

  } catch (error: any) {
    console.error('Add token error:', error);
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      const errorResponse = { 
        error: 'Không thể kết nối đến server CVNL. Vui lòng thử lại sau.' 
      };
      console.log('Sending network error response:', JSON.stringify(errorResponse, null, 2));
      return res.status(500).json(errorResponse);
    }
    
    const errorResponse = { 
      error: 'Có lỗi không xác định xảy ra. Vui lòng thử lại sau.' 
    };
    console.log('Sending unknown error response:', JSON.stringify(errorResponse, null, 2));
    return res.status(500).json(errorResponse);
  }
});

export default router;
