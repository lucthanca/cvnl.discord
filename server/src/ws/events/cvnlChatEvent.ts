import { Socket } from "socket.io";
import { AuthenticatedClient, clients } from "~/ws/clientStore.js";
import channelService, { ThreadChannelWithNewFlag } from "~/services/channel.js";
import { MessageFlags, ReplyOptions, TextChannel } from "discord.js";
import cvnlApiService from "~/services/api.js";
import { EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD } from "~/shared/constants.js";
import { v4 as uuid } from "uuid";
import dbService from "~/services/database.js";

type EventHandler = (client: AuthenticatedClient, data: any) => Promise<void>;

let c17Locked = false;

type C2EventData = {
  data: {
    id: string; // Chat ID
    content: string; // Message content
    replyId?: string; // Optional reply ID
    replySelf?: boolean; // Optional flag for self-reply
  }
};
const c6: EventHandler = async (client, data: any) => {
  // This event is triggered when the stranger likes the chat
  const chatId = client.activeChatId;
  if (!chatId) {
    console.warn(`No active chat for client ${client.user.cvnlUserId}, cannot handle C6 event`);
    return;
  }
  console.log(`🔔 CVNL Chat Event: c6 (stranger liked chat) for user ${client.user.cvnlUserId} with chat ID: ${chatId}`)
  const activeThread = client.activeThread;
  if (!activeThread) {
    console.warn(`No active thread for chat ID ${chatId} for user ${client.user.cvnlUserId}`);
    return;
  }
  await activeThread.send({
    embeds: [{
      title: '❤️ Người lạ đã thích bạn',
      description: `Người lạ đã thích bạn!`,
      color: 0xff69b4, // Pink
    }]
  });
};
const c1: EventHandler = async (client, data: any) => {
  try {
    if (client.activeEphemeralMessage) {
      await client.activeEphemeralMessage.delete();
      client.activeEphemeralMessage = undefined;
    }
    const chatId = data.data.id;

    if (!chatId) {
      console.warn("No chat ID provided in c1 event data");
      return;
    }

    console.log(`🔔 CVNL Chat Event: c1 (chat started) for user ${client.cvnlUserId} with Data:`, data);
    client.activeChatId = chatId;
    if (!client.activeThread) {
      client.activeThread = await channelService.createChatThread(client.discordId, chatId, client.cvnlUserId);
    }

    // Send notifycation to the channel where the thread was created with the thread ID
    await (client.activeThread.parent as TextChannel).send({
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
            value: `<#${client.activeThread.id}>`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: `Chat started for ${client.cvnlUserId.slice(-8)}`
        }
      }]
    });

    console.log(` User data: `, data.data);
    
    // Send message to thread to notify about the stranger joining chat
    await client.activeThread.send({
      embeds: [{
        title: '👥 Người lạ đã tham gia cuộc trò chuyện',
        description: `Bạn đã được ghép với một người lạ. Hãy bắt đầu trò chuyện!`,
        color: 0x57F287,
        fields: [
          {
            name: '💬 Chat ID',
            value: `\`${chatId.slice(-8)}\``,
            inline: true,
          },
          {
            name: '👤 CVNL User',
            value: client.cvnlUserId,
            inline: true,
          },
          {
            name: '🧠 Giới tính',
            value: `\`${cvnlApiService.getGenderName(data.data.gender)}\``,
            inline: true,
          },
          {
            name: '💼 Đang là',
            value: `\`${cvnlApiService.getJobName(data.data.job)}\``,
            inline: true,
          }
        ],
        footer: {
          text: `Đã gửi tin nhắn chào hỏi tới người lạ ^^`
        }
      }]
    });
    // Add discord user to the thread
    let discordUser = await client.activeThread.guild.members.cache.get(client.discordId);
    if (!discordUser) {
      console.warn(`Discord user ${client.discordId} not found in guild ${client.activeThread.guild.id}`);
    } else {
      discordUser = await client.activeThread.guild.members.fetch(client.discordId);
    }
    if (!discordUser) {
      console.error(`Failed to fetch Discord user ${client.discordId} in guild ${client.activeThread.guild.id}`);
      return;
    }
    await client.activeThread.members.add(discordUser);
    // Emit the message to the CVNL client
    client.socket.emit(EVENT_CVNL_NEW_MESSAGE_FROM_DISCORD, {
      content: `Chào cậu nhaaaa!!!`,
      uuid: uuid(),
    });
  } catch (e) {
    console.error('Error handling C1 event:', e);
  }
};
const c2: EventHandler = async (client, data: C2EventData) => {
  try {
    const messageData = data.data;
    const chatId = client.activeChatId;
    const content = messageData.content;

    if (!chatId || !content) {
      console.error('Missing chatId or content in C2 event');
      return;
    }

    console.log(`Processing C2 (new message) for chat ${chatId}`);

    if (!client.activeThread) {
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
        client.activeThread = await channelService.createChatThread(client.discordId, chatId, client.cvnlUserId);
      } else {
        client.activeThread = thread;
      }
    }

    // Format message with sender info
    // const senderIcon = '👥';
    // const senderName = 'Người lạ';
    // const messageColor = 0x57F287;

    let reply: ReplyOptions | undefined = undefined;
    if (messageData.replyId) {
      const threadMessage = await dbService.getResource().threadMessage.findUnique({
        where: {
          cvnlMsgId: messageData.replyId
        },
      });
      if (threadMessage) {
        reply = { messageReference: threadMessage.discordMsgId };
      }
    }
    // Send message to thread
    const discordMessage = await client.activeThread.send({
      content,
      reply,
      // embeds: [{
      //   description: content,
      //   color: messageColor,
      //   author: {
      //     name: `${senderIcon} ${senderName}`,
      //   },
      //   timestamp: new Date().toISOString(),
      //   footer: {
      //     text: `Chat: ${chatId.slice(-8)}`
      //   }
      // }]
    });

    await dbService.getResource().threadMessage.create({
      data: {
        threadId: client.activeThread.id,
        discordMsgId: discordMessage.id,
        cvnlMsgId: messageData.id,
      },
    });
    console.log(`✅ Sent message to thread ${client.activeThread.id} for chat ${chatId}`);

  } catch (error) {
    console.error('Error handling C2 event:', error);
  }
};
const c5: EventHandler = async (client) => {
  // This event is triggered when the stranger leaves the chat
  const chatId = client.activeChatId;
  let activeThread = client.activeThread;
  if (!chatId) {
    console.warn(`No active chat for client ${client.user.cvnlUserId}, cannot handle C5 event`);
    return;
  }
  console.log(`🔔 CVNL Chat Event: c5 (stranger left) for user ${client.user.cvnlUserId} with chat ID: ${chatId}`);
  if (!activeThread) {
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
    activeThread = thread;
  }
  await activeThread.send({
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
        },
        {
          name: 'Bắt đầu cuộc trò chuyện mới',
          value: `Gửi lệnh \`/start\` ở kênh <#${activeThread?.parent?.id}> để bắt đầu cuộc trò chuyện mới.`,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Chat ended for ${client.user.cvnlUserId.slice(-8)}.`
      }
    }]
  });
  await activeThread.setArchived(true);
  try {
    await channelService.archiveChatThread(activeThread.id, 'threadId');
  } catch (error) {
    console.error(`Error archiving thread ${activeThread.id} for chat ID ${chatId}:`, error);
    return;
  }
  console.log(`✅ Archived thread ${activeThread.id} for chat ID ${chatId}`);
  
  client.activeChatId = undefined;
  client.activeThread = undefined;
  client.activeEphemeralMessage = undefined;
};
const c17: EventHandler = async (client, data) => {
  if (c17Locked) return;
  c17Locked = true;
  const { order } = data.data;
  try {
    if (order <= 0) {
      throw new Error(`User ${client.user.cvnlUserId} found chat partner (order: ${order}), no notification sent`);
    }
    
    const embeds = [{
      title: '📊 Cập nhật hàng đợi',
      description: `⏳ **${client.user.cvnlUserId}** đang ở vị trí **${order}** trong hàng đợi`,
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
    }];
    if (client.activeEphemeralMessage) {
      await client.activeEphemeralMessage.edit({ embeds });
    } else {
      const channel = await channelService.getChannel(client.user.discordId, client.user.cvnlUserId);
      if (!channel) {
        throw new Error(`No channel found for user ${client.user.cvnlUserId}, cannot send order notification`);
      }
      client.activeEphemeralMessage = await channel.send({
        embeds,
        options: { flags: MessageFlags.Ephemeral }
      });
    }
  } catch (error: any) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.error(`Error handling C17 event for user ${client.user.cvnlUserId}:`, error);
    }
  }
  c17Locked = false;
};
const c4: EventHandler = async (client) => {
  // This event is triggered when the stranger is typing
  const chatId = client.activeChatId;
  const activeThread = client.activeThread;
  if (!chatId || !activeThread?.id) {
    console.warn(`No active chat for client ${client.user.cvnlUserId}, cannot handle C4 event`);
    return;
  }
  console.log(`🔔 CVNL Chat Event: c4 (stranger typing) for user ${client.user.cvnlUserId} with chat ID: ${chatId}`)
  await activeThread.sendTyping();
}
const c20: EventHandler = async (client, data) => {
  // This event is triggered when the stranger reactions to a message
  const chatId = client.activeChatId;
  if (!chatId) {
    console.warn(`No active chat for client ${client.user.cvnlUserId}, cannot handle C20 event`);
    return;
  }
  console.log(`🔔 CVNL Chat Event: c20 (stranger reacted) for user ${client.user.cvnlUserId} with chat ID: ${chatId}`)
  const messageId = data.data.id;
  const reactionIcon = data.data.reaction;

  if (!messageId || !reactionIcon) {
    console.warn(`No message ID or reaction icon provided in C20 event data for user ${client.user.cvnlUserId}`);
    return;
  }
  const activeThread = client.activeThread;
  if (!activeThread) {
    console.warn(`No active thread for chat ID ${chatId} for user ${client.user.cvnlUserId}`);
    return;
  }
  try {
    const msg = await dbService.getResource().threadMessage.findUnique({ where: { cvnlMsgId: messageId } });
    if (!msg) return;
    const discordMsg = await activeThread.messages.fetch(msg.discordMsgId);
    if (!discordMsg) return;
    await discordMsg.react(reactionIcon);
  } catch (error) {
    console.error(`Error reacting to message ${messageId} in thread ${activeThread.id} for chat ID ${chatId}:`, error);
  }
}
const handlers: Map<string, EventHandler> = new Map([
  ["c1", c1],
  ["c2", c2],
  ["c5", c5],
  ["c4", c4],
  ["c17", c17],
  ["c6", c6],
  ["c20", c20],
]);

export default async function onCVNLChatEvent(socket: Socket, data: any) {
  const sockId = socket.id;
  // loop through all clients to find the one with the matching socket ID
  for (const [cl, sock] of clients.entries()) {
    if (sock.socket.id === sockId) {
      const eventType = data.event;
      if (handlers.has(eventType)) {
        try {
          await handlers.get(eventType)?.(sock, data);
        } catch (error) {
          console.error(`Error handling event ${eventType} for client ${cl}:`, error);
        }
      } else {
        console.warn(`Unhandled CVNL event: ${eventType} for client ${cl} with data:`, data);
      }
      break;
    }
  }
}

