import { SERVER_URL } from "@src/constants";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
}

export interface TokenData {
  id: string;
  token: string;
  userName: string;
  userId: string;
  addedAt: string;
  status: string;
  userInfo: {
    gender: string;
    job: number;
    age: number;
  };
}

export const saveTokenToServer = async (discordUserId: string, token: string) => {
  try {
    console.log('Saving token to server:', { discordUserId, tokenLength: token.length });
    
    const response = await fetch(`${SERVER_URL}/api/discord/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        discordUserId,
        token,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    console.log('Response text length:', responseText.length);

    if (!response.ok) {
      console.error('Server error response:', responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('Parsed error data:', errorData);
        return { success: false, error: errorData.error || 'Server error' };
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        return { success: false, error: `Server error (${response.status}): ${responseText}` };
      }
    }

    if (!responseText || responseText.trim() === '') {
      console.error('Empty response from server');
      return { success: false, error: 'Empty response from server' };
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      
      // Validate response structure
      if (typeof data !== 'object' || data === null) {
        console.error('Response is not an object:', typeof data);
        return { success: false, error: 'Invalid response format: not an object' };
      }
      
      if (!data.hasOwnProperty('success')) {
        console.error('Response missing success property:', Object.keys(data));
        return { success: false, error: 'Invalid response format: missing success property' };
      }
      
      return data;
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      console.error('Parse error details:', {
        message: parseError instanceof Error ? parseError.message : String(parseError),
        responseText: responseText.substring(0, 200) + '...'
      });
      return { success: false, error: 'Invalid server response format: JSON parse failed' };
    }

  } catch (error) {
    console.error('Network error in saveTokenToServer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
};