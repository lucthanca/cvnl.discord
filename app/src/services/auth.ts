import * as io from 'socket.io-client';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
}

export const authenticateWithDiscord = async (): Promise<DiscordUser> => {
  return new Promise((resolve, reject) => {
    try {
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      const redirectUri = chrome.identity.getRedirectURL();
      const scope = "identify";

      console.log("Discord OAuth config:", {
        clientId,
        redirectUri,
        scope,
      });

      const authUrl =
        `https://discord.com/api/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}`;

      console.log("Opening OAuth URL:", authUrl);

      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError || !redirectUrl) {
            console.error("OAuth error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError?.message || "OAuth failed"));
            return;
          }

          try {
            const url = new URL(redirectUrl);
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");

            if (error) {
              throw new Error(`OAuth error: ${error}`);
            }

            if (!code) {
              throw new Error("No authorization code received");
            }

            // Exchange code for token via backend
            const tokenResponse = await fetch(
              "http://localhost:3000/api/discord/oauth/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  code: code,
                  redirect_uri: redirectUri,
                }),
              }
            );

            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json();
              throw new Error(errorData.error || "Failed to exchange code for token");
            }

            const tokenData = await tokenResponse.json();

            const discordUser: DiscordUser = {
              id: tokenData.user.id,
              username: tokenData.user.username,
              discriminator: tokenData.user.discriminator,
              avatar: tokenData.user.avatar,
            };

            resolve(discordUser);
          } catch (error: any) {
            console.error("Token exchange error:", error);
            reject(error);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

export const saveDiscordUser = async (user: DiscordUser): Promise<void> => {
  try {
    // Save to chrome storage if available (extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ discordUser: user });
      console.log('Discord user saved to chrome storage');
    } else {
      // Fallback to localStorage for web context
      localStorage.setItem('discordUser', JSON.stringify(user));
      console.log('Discord user saved to localStorage');
    }
  } catch (error) {
    console.error('Error saving Discord user:', error);
  }
};

export const loadDiscordUser = async (): Promise<DiscordUser | null> => {
  try {
    // Try chrome storage first (extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['discordUser']);
      if (result.discordUser) {
        console.log('Loaded Discord user from chrome storage');
        return result.discordUser;
      }
    } else {
      // Fallback to localStorage (web context)
      const stored = localStorage.getItem('discordUser');
      if (stored) {
        console.log('Loaded Discord user from localStorage');
        return JSON.parse(stored);
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading Discord user:', error);
    return null;
  }
};

export const removeDiscordUser = async (): Promise<void> => {
  try {
    // Remove from chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove(['discordUser']);
      console.log('Discord user removed from chrome storage');
    } else {
      // Remove from localStorage
      localStorage.removeItem('discordUser');
      console.log('Discord user removed from localStorage');
    }
  } catch (error) {
    console.error('Error removing Discord user:', error);
  }
};