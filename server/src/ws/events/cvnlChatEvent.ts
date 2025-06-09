import { Socket } from "socket.io";
import { AuthenticatedClient, clients } from "~/ws/clientStore.js";
import channelService, { ThreadChannelWithNewFlag } from "~/services/channel.js";
import { MessageFlags, TextChannel } from "discord.js";
import cvnlApiService from "~/services/api.js";

type EventHandler = (client: AuthenticatedClient, data: any) => Promise<void>;

const c1: EventHandler = async (client, data: any) => {
  try {
    if (client.activeEphemeralMessage) {
      await client.activeEphemeralMessage.delete();
      client.activeEphemeralMessage = undefined;
    }
    const chatId = data.data.id;
    const gender = cvnlApiService.getGenderName(data.data.gender);

    if (!chatId) {
      console.warn("No chat ID provided in c1 event data");
      return;
    }

    console.log(`🔔 CVNL Chat Event: c1 (chat started) for user ${client.cvnlUserId} with Data:`, data);
    client.activeChatId = chatId;
    const remoteThread = await channelService.createChatThread(client.discordId, chatId, client.cvnlUserId);

    // Send notifycation to the channel where the thread was created with the thread ID
    await (remoteThread.parent as TextChannel).send({
      embeds: [{
        title: '🌟 Cuộc trò chuyện mới bắt đầu',
        description: `Bạn đã được ghép với một người lạ`,
        color: 0x00ff00,
        fields: [
          {
            name: '💬 Chat ID',
            value: `\`${chatId}\``,
            inline: true
          },
          {
            name: '👤 CVNL User',
            value: client.cvnlUserId,
            inline: true
          },
          {
            name: '🧵 Thread',
            value: `<#${remoteThread.id}>`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `Chat started for ${client.cvnlUserId.slice(-8)}`
        }
      }]
    });

    // Send message to thread to notify about the stranger joining chat
    await remoteThread.send({
      embeds: [{
        title: '👥 Người lạ đã tham gia cuộc trò chuyện',
        description: `Bạn đã được ghép với một người lạ. Hãy bắt đầu trò chuyện!`,
        color: 0x57F287,
        fields: [
          {
            name: '💬 Chat ID',
            value: `\`${chatId.slice(-8)}\``,
            inline: true
          },
          {
            name: '👤 CVNL User',
            value: client.cvnlUserId,
            inline: true
          },
          {
            name: '🧠 Giới tính',
            value: `\`${gender}\``,
          }
        ],
      }]
    });
  } catch (e) {
    console.error('Error handling C1 event:', e);
  }
};
const c2: EventHandler = async (client, data) => {
  try {
    const messageData = data.data as {
      id: string;
      content: string;
    };
    const chatId = client.activeChatId;
    const content = messageData.content;

    if (!chatId || !content) {
      console.error('Missing chatId or content in C2 event');
      return;
    }

    console.log(`Processing C2 (new message) for chat ${chatId}`);

    // Find thread for this chat
    const chatThread = await channelService.getUserChatThread(chatId, client.cvnlUserId);
    if (!chatThread) {
      console.log(`No thread found for chat ${chatId}, skipping message`);
      return;
    }

    // Get the thread
    let thread = await channelService.getChannelById(chatThread.threadId) as ThreadChannelWithNewFlag | null;
    if (!thread || !thread.isThread()) {
      console.log(`Thread ${chatThread.threadId} no longer exists`);
      // Clean up database
      await channelService.deleteChatThread(chatThread.id);

      // Create a new thread for the chat
      thread = await channelService.createChatThread(client.discordId, chatId, client.cvnlUserId);
    }

    // Format message with sender info
    const senderIcon = '👥';
    const senderName = 'Người lạ';
    const messageColor = 0x57F287;

    // Send message to thread
    await thread.send({
      embeds: [{
        description: content,
        color: messageColor,
        author: {
          name: `${senderIcon} ${senderName}`,
        },
        timestamp: new Date().toISOString(),
        footer: {
          text: `Chat: ${chatId.slice(-8)}`
        }
      }]
    });

    console.log(`✅ Sent message to thread ${chatThread.threadId} for chat ${chatId}`);

  } catch (error) {
    console.error('Error handling C2 event:', error);
  }
};
const c5: EventHandler = async (client) => {
  // This event is triggered when the stranger leaves the chat
  const chatId = client.activeChatId;
  if (!chatId) {
    console.warn(`No active chat for client ${client.user.cvnlUserId}, cannot handle C5 event`);
    return;
  }
  console.log(`🔔 CVNL Chat Event: c5 (stranger left) for user ${client.user.cvnlUserId} with chat ID: ${chatId}`);
  client.activeChatId = undefined;
  const threadChat = await channelService.getUserChatThread(chatId, client.user.cvnlUserId);
  if (!threadChat) {
    console.warn(`No thread found for chat ID ${chatId} for user ${client.user.cvnlUserId}`);
    return;
  }
  const thread = await channelService.getChannelById(threadChat.threadId);
  if (!thread || !thread.isThread()) {
    console.warn(`Thread ${threadChat.threadId} is not valid or does not exist`);
    return;
  }
  await thread.send({
    embeds: [{
      title: '👋 Người lạ đã rời cuộc trò chuyện',
      description: `Cuộc trò chuyện với người lạ đã kết thúc.`,
      color: 0xff0000, // Red
      fields: [
        {
          name: '💬 Chat ID',
          value: `\`${chatId.slice(-8)}\``,
          inline: true
        },
        {
          name: '👤 CVNL User',
          value: client.user.cvnlUserName,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Chat ended for ${client.user.cvnlUserId.slice(-8)}`
      }
    }]
  });
  await thread.setArchived(true);
  await channelService.archiveChatThread(threadChat.id);
  console.log(`✅ Archived thread ${threadChat.threadId} for chat ID ${chatId}`);
};
const c17: EventHandler = async (client, data) => {
  const { order } = data.data;
  if (order <= 0) {
    console.log(`User ${client.user.cvnlUserId} found chat partner (order: ${order}), no notification sent`);
    return;
  }
  const channel = await channelService.getChannel(client.user.discordId, client.user.cvnlUserId);
  if (!channel) {
    console.warn(`No channel found for user ${client.user.cvnlUserId}, cannot send order notification`);
    return;
  }
  const description = `⏳ **${client.user.cvnlUserId}** đang ở vị trí **${order}** trong hàng đợi`;
  if (client.activeEphemeralMessage) {
    await client.activeEphemeralMessage.edit({
      embeds: [{
        title: '📊 Cập nhật hàng đợi',
        description: description,
        color: 0xffa500, // Orange
        fields: [
          {
            name: '👤 Người dùng',
            value: client.user.cvnlUserName,
            inline: true
          },
          {
            name: '🆔 CVNL User ID',
            value: client.user.cvnlUserId.slice(-8),
            inline: true
          },
          {
            name: '📍 Vị trí',
            value: `#${order}`,
            inline: true
          },
          {
            name: '🎭 Discord ID',
            value: client.user.discordId.slice(-8),
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `CVNL: ${client.user.cvnlUserId.slice(-8)} | Discord: ${client.user.discordId.slice(-8)}`
        }
      }],
    });
    return;
  }
  client.activeEphemeralMessage = await channel.send({
    embeds: [{
      title: '📊 Cập nhật hàng đợi',
      description: description,
      color: 0xffa500, // Orange
      fields: [
        {
          name: '👤 Người dùng',
          value: client.user.cvnlUserName,
          inline: true
        },
        {
          name: '🆔 CVNL User ID',
          value: client.user.cvnlUserId.slice(-8),
          inline: true
        },
        {
          name: '📍 Vị trí',
          value: `#${order}`,
          inline: true
        },
        {
          name: '🎭 Discord ID',
          value: client.user.discordId.slice(-8),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `CVNL: ${client.user.cvnlUserId.slice(-8)} | Discord: ${client.user.discordId.slice(-8)}`
      }
    }],
    options: {
      flags: MessageFlags.Ephemeral,
    }
  });
};

const handlers: Map<string, EventHandler> = new Map([
  ["c1", c1],
  ["c2", c2],
  ["c5", c5],
  ["c17", c17],
]);

export default async function onCVNLChatEvent(socket: Socket, data: any) {
  const sockId = socket.id;
  // loop through all clients to find the one with the matching socket ID
  for (const [cl, sock] of clients.entries()) {
    if (sock.socket.id === sockId) {
      console.log(`🔌 CVNL Chat Event: ${sockId} for client ${cl}`);
      const eventType = data.event;
      if (handlers.has(eventType)) {
        try {
          await handlers.get(eventType)?.(sock, data);
        } catch (error) {
          console.error(`Error handling event ${eventType} for client ${cl}:`, error);
        }
      } else {
        console.warn(`Unhandled CVNL event: ${eventType} for client ${cl}`);
      }
      break;
    }
  }
}

